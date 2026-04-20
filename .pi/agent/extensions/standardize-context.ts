import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type ContextFile = { path: string; content: string };

const PROJECT_CONTEXT_HEADER = "\n\n# Project Context\n\nProject-specific instructions and guidelines:\n\n";
const SKILLS_MARKER = "\n\nThe following skills provide specialized instructions for specific tasks.";
const DATE_MARKER = "\nCurrent date and time:";

function isReadableFile(path: string): boolean {
	if (!existsSync(path)) return false;
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

function readIfFile(path: string): string | null {
	if (!isReadableFile(path)) return null;
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}

function readContextFile(path: string | null): ContextFile | null {
	if (path == null) return null;
	const content = readIfFile(path);
	if (content == null) return null;
	return { path, content };
}

function firstExistingFile(dir: string, fileNames: readonly string[]): string | null {
	for (const fileName of fileNames) {
		const candidate = join(dir, fileName);
		if (isReadableFile(candidate)) return candidate;
	}
	return null;
}

function expandHomePath(path: string): string {
	if (path === "~") return homedir();
	if (path.startsWith("~/")) return join(homedir(), path.slice(2));
	if (path.startsWith("~")) return join(homedir(), path.slice(1));
	return path;
}

function collectClaudeFallbackFiles(cwd: string): ContextFile[] {
	const files: ContextFile[] = [];
	let dir = resolve(cwd);

	while (true) {
		const agentsPath = firstExistingFile(dir, ["AGENTS.md"]);
		const claudePath = firstExistingFile(dir, ["CLAUDE.md"]);

		if (!agentsPath && claudePath) {
			const claudeFile = readContextFile(claudePath);
			if (claudeFile != null) {
				files.push(claudeFile);
			}
		}

		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	return files;
}

function getPiAgentDir(): string {
	const override = process.env.PI_CODING_AGENT_DIR?.trim();
	if (!override) {
		return join(homedir(), ".pi", "agent");
	}

	const expanded = expandHomePath(override);
	return isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
}

function getBuiltinGlobalContextFile(): ContextFile | null {
	const agentDir = getPiAgentDir();
	const builtInPath = firstExistingFile(agentDir, ["AGENTS.md", "CLAUDE.md"]);
	return readContextFile(builtInPath);
}

function getPreferredGlobalContextFile(): ContextFile | null {
	const home = homedir();
	const agentsPath = firstExistingFile(join(home, ".agents"), ["AGENTS.md"]);
	const agentsFile = readContextFile(agentsPath);
	if (agentsFile != null) {
		return agentsFile;
	}

	const claudePath = firstExistingFile(join(home, ".claude"), ["CLAUDE.md"]);
	return readContextFile(claudePath);
}

function formatDisplayPath(path: string): string {
	const home = homedir();
	if (path === home) return "~";
	if (path.startsWith(`${home}/`)) return `~/${path.slice(home.length + 1)}`;
	return path;
}

function buildContextEntry(file: ContextFile): string {
	return `## ${file.path}\n\n${file.content}\n\n`;
}

function stripContextEntry(prompt: string, file: ContextFile): string {
	return prompt.replace(buildContextEntry(file), "");
}

function stripEmptyProjectContext(prompt: string): string {
	return prompt.replace(
		/\n\n# Project Context\n\nProject-specific instructions and guidelines:\n\n(?=(?:\n\nThe following skills provide specialized instructions for specific tasks\.|\nCurrent date and time:|$))/,
		"",
	);
}

function insertProjectContextEntry(prompt: string, file: ContextFile): string {
	const normalizedPrompt = stripContextEntry(prompt, file);
	const entry = buildContextEntry(file);
	const addition = normalizedPrompt.includes(PROJECT_CONTEXT_HEADER)
		? entry
		: `${PROJECT_CONTEXT_HEADER}${entry}`;

	const skillsIndex = normalizedPrompt.indexOf(SKILLS_MARKER);
	const dateIndex = normalizedPrompt.indexOf(DATE_MARKER);
	const insertIndex = skillsIndex >= 0 ? skillsIndex : dateIndex;

	if (insertIndex < 0) {
		return `${normalizedPrompt}${addition}`;
	}

	return `${normalizedPrompt.slice(0, insertIndex)}${addition}${normalizedPrompt.slice(insertIndex)}`;
}

function buildClaudeFallbackAddition(files: ContextFile[]): string {
	let out = "\n\n## CLAUDE.md context (AGENTS.md fallback)\n";
	out += "Apply these files exactly as AGENTS-style instructions.\n";

	for (const file of files) {
		out += `\n### ${file.path}\n\n`;
		out += `${file.content}\n`;
	}

	return out;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		const preferredGlobalFile = getPreferredGlobalContextFile();
		if (preferredGlobalFile == null) {
			return;
		}

		ctx.ui.notify(`Global context override: ${formatDisplayPath(preferredGlobalFile.path)}`, "info");
	});
	pi.on("before_agent_start", (event, ctx) => {
		let systemPrompt = event.systemPrompt;

		const preferredGlobalFile = getPreferredGlobalContextFile();
		if (preferredGlobalFile != null) {
			const builtinGlobalFile = getBuiltinGlobalContextFile();
			if (builtinGlobalFile != null) {
				systemPrompt = stripContextEntry(systemPrompt, builtinGlobalFile);
				systemPrompt = stripEmptyProjectContext(systemPrompt);
			}
			systemPrompt = insertProjectContextEntry(systemPrompt, preferredGlobalFile);
		}

		const claudeFallbackFiles = collectClaudeFallbackFiles(ctx.cwd);
		if (claudeFallbackFiles.length > 0) {
			systemPrompt += buildClaudeFallbackAddition(claudeFallbackFiles);
		}

		if (systemPrompt === event.systemPrompt) {
			return;
		}

		return { systemPrompt };
	});
}
