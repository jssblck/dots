import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const PI_EXTENSION_LOCATION_CONTEXT = [
	"",
	"",
	"## Pi extension location (required)",
	"",
	"When creating, updating, or moving pi extensions:",
	"- Always use the user-level extensions directory: `~/.pi/agent/extensions/`.",
	"- Do not create or modify extensions inside project directories (for example, `./.pi/extensions/`) unless the user explicitly asks for a project-local extension.",
	"- If an extension is created in a project by mistake, move it to the user-level directory.",
].join("\n");

export default function piExtensionLocation(pi: ExtensionAPI) {
	pi.on("before_agent_start", (event) => ({
		systemPrompt: event.systemPrompt + PI_EXTENSION_LOCATION_CONTEXT,
	}));
}
