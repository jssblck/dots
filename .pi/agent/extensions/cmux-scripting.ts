import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
  truncateTail,
  type ExtensionAPI,
  type TruncationResult,
} from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type, type Static } from "@sinclair/typebox";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CMUX_OUTPUT_LIMIT = `${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)} (whichever is hit first)`;

type OutputStrategy = "head" | "tail";

type TruncatedOutput = {
  text: string;
  truncation?: TruncationResult;
  fullOutputPath?: string;
};

type CmuxCommandResult = {
  commandText: string;
  commandArgs: string[];
  exitCode: number | null;
  killed: boolean;
  stdout: TruncatedOutput;
  stderr: TruncatedOutput;
};

type CmuxCommandDetails = {
  command: string;
  args: string[];
  exitCode: number | null;
  killed: boolean;
  stdout: {
    text: string;
    truncation?: TruncationResult;
    fullOutputPath?: string;
  };
  stderr: {
    text: string;
    truncation?: TruncationResult;
    fullOutputPath?: string;
  };
};

type CmuxAvailability = "unknown" | "available" | "unavailable";

type AutomationLogLevel = "info" | "progress" | "success" | "warning" | "error";

type AutomationRunState = {
  startedAtMs: number;
  promptPreview: string;
  turnCount: number;
  toolCount: number;
  lastToolName?: string;
};

const AUTOMATION_STATUS_KEY = "pi";
const AUTOMATION_LOG_SOURCE = "pi-agent";
const AUTOMATION_NOTIFICATION_THRESHOLD_MS = 15_000;

function quotePart(part: string): string {
  return /[\s"'\\]/.test(part) ? JSON.stringify(part) : part;
}

function formatCommand(parts: string[]): string {
  return parts.map((part) => quotePart(part)).join(" ");
}

function requiredString(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error(`\"${name}\" is required.`);
  }
  return value;
}

function sanitizeSingleLine(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= 3) {
    return normalized.slice(0, maxLength);
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(1, Math.round(durationMs / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function calculateAutomationProgress(state: AutomationRunState): number {
  const turnProgress = Math.min(0.45, state.turnCount * 0.1);
  const toolProgress = Math.min(0.4, state.toolCount * 0.03);
  return Math.min(0.92, 0.05 + turnProgress + toolProgress);
}

function formatCompletionSummary(state: AutomationRunState, durationMs: number): string {
  const duration = formatDuration(durationMs);
  const turns = `${state.turnCount} turn${state.turnCount === 1 ? "" : "s"}`;
  const tools = `${state.toolCount} tool${state.toolCount === 1 ? "" : "s"}`;

  return `${duration}, ${turns}, ${tools}`;
}

function truncateOutput(content: string, strategy: OutputStrategy, outputName: string): TruncatedOutput {
  if (content.length === 0) {
    return { text: "" };
  }

  const truncation =
    strategy === "head"
      ? truncateHead(content, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES })
      : truncateTail(content, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });

  if (!truncation.truncated) {
    return { text: truncation.content };
  }

  let fullOutputPath: string | undefined;

  try {
    const tempDir = mkdtempSync(join(tmpdir(), "pi-cmux-"));
    fullOutputPath = join(tempDir, `${outputName}.txt`);
    writeFileSync(fullOutputPath, content, "utf8");
  } catch {
    fullOutputPath = undefined;
  }

  const omittedLines = truncation.totalLines - truncation.outputLines;
  const omittedBytes = truncation.totalBytes - truncation.outputBytes;

  let text = truncation.content;
  text += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`;
  text += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
  text += ` ${omittedLines} lines (${formatSize(omittedBytes)}) omitted.`;
  text += fullOutputPath
    ? ` Full output saved to: ${fullOutputPath}]`
    : " Full output could not be written to a temp file.]";

  return {
    text,
    truncation,
    fullOutputPath,
  };
}

function formatCommandOutput(result: CmuxCommandResult): string {
  const sections: string[] = [`Command: ${result.commandText}`];

  if (result.stdout.text.length > 0) {
    sections.push(`STDOUT:\n${result.stdout.text}`);
  }

  if (result.stderr.text.length > 0) {
    sections.push(`STDERR:\n${result.stderr.text}`);
  }

  if (sections.length === 1) {
    sections.push("Command completed with no output.");
  }

  return sections.join("\n\n");
}

function toCommandDetails(result: CmuxCommandResult): CmuxCommandDetails {
  return {
    command: result.commandText,
    args: result.commandArgs,
    exitCode: result.exitCode,
    killed: result.killed,
    stdout: {
      text: result.stdout.text,
      truncation: result.stdout.truncation,
      fullOutputPath: result.stdout.fullOutputPath,
    },
    stderr: {
      text: result.stderr.text,
      truncation: result.stderr.truncation,
      fullOutputPath: result.stderr.fullOutputPath,
    },
  };
}

async function runCmux(
  pi: ExtensionAPI,
  args: string[],
  signal: AbortSignal | undefined,
  outputStrategy: OutputStrategy,
): Promise<CmuxCommandResult> {
  const execResult = await pi.exec("cmux", args, { signal });
  const commandArgs = ["cmux", ...args];

  return {
    commandArgs,
    commandText: formatCommand(commandArgs),
    exitCode: execResult.code,
    killed: execResult.killed,
    stdout: truncateOutput(execResult.stdout, outputStrategy, "stdout"),
    stderr: truncateOutput(execResult.stderr, "tail", "stderr"),
  };
}

function ensureSuccess(result: CmuxCommandResult): void {
  if (result.exitCode === 0) {
    return;
  }

  const code = result.exitCode === null ? "unknown" : String(result.exitCode);
  const killedText = result.killed ? " The process was terminated." : "";
  throw new Error(`cmux command failed with exit code ${code}.${killedText}\n\n${formatCommandOutput(result)}`);
}


const InspectActionValues = [
  "capabilities",
  "identify",
  "list_windows",
  "current_window",
  "list_workspaces",
  "current_workspace",
  "list_panes",
  "list_pane_surfaces",
  "list_panels",
  "read_screen",
  "list_notifications",
  "clear_notifications",
] as const;

type InspectAction = (typeof InspectActionValues)[number];

const InspectSchema = Type.Object({
  action: StringEnum(InspectActionValues, { description: "cmux state/inspection action" }),
  window: Type.Optional(Type.String({ description: "Optional window id/ref" })),
  workspace: Type.Optional(Type.String({ description: "Optional workspace id/ref" })),
  surface: Type.Optional(Type.String({ description: "Optional surface id/ref" })),
  pane: Type.Optional(Type.String({ description: "Optional pane id/ref (for list_pane_surfaces)" })),
  lines: Type.Optional(Type.Integer({ description: "Line limit for read_screen", minimum: 1 })),
  scrollback: Type.Optional(Type.Boolean({ description: "Include scrollback in read_screen" })),
  json: Type.Optional(Type.Boolean({ description: "Use --json for commands that support it (default: true)" })),
});

type InspectInput = Static<typeof InspectSchema>;

type InspectBuildResult = {
  args: string[];
  outputStrategy: OutputStrategy;
};

const InspectJsonSafeActions: ReadonlySet<InspectAction> = new Set([
  "capabilities",
  "identify",
  "list_windows",
  "current_window",
  "list_workspaces",
  "current_workspace",
  "list_panes",
  "list_pane_surfaces",
  "list_panels",
  "list_notifications",
]);

function buildInspectArgs(input: InspectInput): InspectBuildResult {
  const args: string[] = [];
  const useJson = input.json ?? true;
  const action = input.action as InspectAction;

  if (input.window) {
    args.push("--window", input.window);
  }
  if (input.workspace) {
    args.push("--workspace", input.workspace);
  }
  if (input.surface) {
    args.push("--surface", input.surface);
  }
  if (useJson && InspectJsonSafeActions.has(action)) {
    args.push("--json");
  }

  switch (action) {
    case "capabilities": {
      args.push("capabilities");
      return { args, outputStrategy: "head" };
    }

    case "identify": {
      args.push("identify");
      return { args, outputStrategy: "head" };
    }

    case "list_windows": {
      args.push("list-windows");
      return { args, outputStrategy: "head" };
    }

    case "current_window": {
      args.push("current-window");
      return { args, outputStrategy: "head" };
    }

    case "list_workspaces": {
      args.push("list-workspaces");
      return { args, outputStrategy: "head" };
    }

    case "current_workspace": {
      args.push("current-workspace");
      return { args, outputStrategy: "head" };
    }

    case "list_panes": {
      args.push("list-panes");
      return { args, outputStrategy: "head" };
    }

    case "list_pane_surfaces": {
      args.push("list-pane-surfaces");
      if (input.pane) {
        args.push("--pane", input.pane);
      }
      return { args, outputStrategy: "head" };
    }

    case "list_panels": {
      args.push("list-panels");
      return { args, outputStrategy: "head" };
    }

    case "read_screen": {
      args.push("read-screen");
      if (input.scrollback) {
        args.push("--scrollback");
      }
      if (input.lines !== undefined) {
        args.push("--lines", String(input.lines));
      }
      return { args, outputStrategy: "tail" };
    }

    case "list_notifications": {
      args.push("list-notifications");
      return { args, outputStrategy: "head" };
    }

    case "clear_notifications": {
      args.push("clear-notifications");
      return { args, outputStrategy: "tail" };
    }

    default: {
      const exhaustive: never = action;
      throw new Error(`Unsupported inspect action: ${exhaustive}`);
    }
  }
}

export default function cmuxScriptingExtension(pi: ExtensionAPI) {
  let cmuxAvailability: CmuxAvailability = "unknown";
  let automationQueue: Promise<void> = Promise.resolve();
  let automationEnabled = true;
  let notificationsEnabled = true;
  let notificationThresholdMs = AUTOMATION_NOTIFICATION_THRESHOLD_MS;
  let pendingPromptPreview = "task";
  let activeRun: AutomationRunState | undefined;

  async function ensureCmuxAvailable(): Promise<boolean> {
    if (cmuxAvailability === "available") {
      return true;
    }

    if (cmuxAvailability === "unavailable") {
      return false;
    }

    try {
      const probe = await pi.exec("cmux", ["ping"], { timeout: 2000 });
      cmuxAvailability = probe.code === 0 ? "available" : "unavailable";
    } catch {
      cmuxAvailability = "unavailable";
    }

    return cmuxAvailability === "available";
  }

  async function runAutomationCommand(args: string[]): Promise<void> {
    if (!automationEnabled) {
      return;
    }

    const available = await ensureCmuxAvailable();
    if (!available) {
      return;
    }

    try {
      const result = await runCmux(pi, args, undefined, "tail");
      if (result.exitCode !== 0) {
        return;
      }
    } catch {
      return;
    }
  }

  function enqueueAutomationCommand(args: string[]): void {
    automationQueue = automationQueue
      .then(async () => runAutomationCommand(args))
      .catch(async () => undefined);
  }

  function enqueueStatus(text: string): void {
    enqueueAutomationCommand(["set-status", AUTOMATION_STATUS_KEY, text]);
  }

  function enqueueClearStatus(): void {
    enqueueAutomationCommand(["clear-status", AUTOMATION_STATUS_KEY]);
  }

  function enqueueProgress(value: number, label: string): void {
    const clamped = Math.max(0, Math.min(1, value));
    enqueueAutomationCommand(["set-progress", String(clamped), "--label", label]);
  }

  function enqueueClearProgress(): void {
    enqueueAutomationCommand(["clear-progress"]);
  }

  function enqueueClearNotifications(): void {
    enqueueAutomationCommand(["clear-notifications"]);
  }

  function enqueueLog(level: AutomationLogLevel, message: string): void {
    enqueueAutomationCommand(["log", "--level", level, "--source", AUTOMATION_LOG_SOURCE, "--", message]);
  }

  function enqueueNotification(title: string, subtitle?: string, body?: string): void {
    const args = ["notify", "--title", title];

    if (subtitle && subtitle.trim().length > 0) {
      args.push("--subtitle", subtitle);
    }

    if (body && body.trim().length > 0) {
      args.push("--body", body);
    }
    enqueueAutomationCommand(args);
  }

  function resetAutomationState(): void {
    activeRun = undefined;
    pendingPromptPreview = "task";
  }

  function setReadyState(): void {
    enqueueClearProgress();
    enqueueStatus("ready");
  }

  function shouldNotifyCompletion(_state: AutomationRunState, durationMs: number): boolean {
    if (!notificationsEnabled) {
      return false;
    }

    return durationMs >= notificationThresholdMs;
  }

  pi.registerCommand("cmux-auto", {
    description: "Configure cmux automation (status + notifications)",
    handler: async (rawArgs, ctx) => {
      const args = rawArgs.trim();

      if (args.length === 0 || args === "status") {
        const enabledText = automationEnabled ? "on" : "off";
        const notificationsText = notificationsEnabled ? "on" : "off";
        const thresholdText = `${Math.round(notificationThresholdMs / 1000)}s`;
        ctx.ui.notify(`cmux auto: ${enabledText}, notify: ${notificationsText}, threshold: ${thresholdText}`, "info");
        return;
      }

      const parts = args.split(/\s+/);
      const [subcommand, value] = parts;

      switch (subcommand) {
        case "on": {
          automationEnabled = true;
          setReadyState();
          ctx.ui.notify("cmux automation enabled", "info");
          return;
        }

        case "off": {
          automationEnabled = false;
          enqueueClearProgress();
          enqueueClearStatus();
          ctx.ui.notify("cmux automation disabled", "warning");
          return;
        }

        case "notify": {
          if (value !== "on" && value !== "off") {
            ctx.ui.notify('Usage: /cmux-auto notify <on|off>', "warning");
            return;
          }

          notificationsEnabled = value === "on";
          ctx.ui.notify(`cmux notifications ${notificationsEnabled ? "enabled" : "disabled"}`, "info");
          return;
        }

        case "threshold": {
          if (!value) {
            ctx.ui.notify('Usage: /cmux-auto threshold <seconds>', "warning");
            return;
          }

          const seconds = Number(value);
          if (!Number.isFinite(seconds) || seconds <= 0) {
            ctx.ui.notify("Threshold must be a positive number of seconds", "warning");
            return;
          }

          notificationThresholdMs = Math.round(seconds * 1000);
          ctx.ui.notify(`cmux notification threshold set to ${Math.round(notificationThresholdMs / 1000)}s`, "info");
          return;
        }

        default: {
          ctx.ui.notify("Usage: /cmux-auto [status|on|off|notify on|notify off|threshold <seconds>]", "warning");
          return;
        }
      }
    },
  });

  pi.on("session_start", async () => {
    if (!automationEnabled) {
      return;
    }

    cmuxAvailability = "unknown";
    enqueueClearNotifications();
    resetAutomationState();
    setReadyState();
    enqueueLog("info", "Session started");
  });

  pi.on("session_switch", async (event) => {
    if (!automationEnabled) {
      return;
    }

    if (event.reason === "new") {
      enqueueClearNotifications();
    }
    resetAutomationState();
    setReadyState();
    enqueueLog("info", "Session switched");
  });

  pi.on("before_agent_start", async (event) => {
    pendingPromptPreview = sanitizeSingleLine(event.prompt, 90) || "task";
  });

  pi.on("agent_start", async () => {
    if (!automationEnabled) {
      return;
    }

    activeRun = {
      startedAtMs: Date.now(),
      promptPreview: pendingPromptPreview,
      turnCount: 0,
      toolCount: 0,
      lastToolName: undefined,
    };

    enqueueStatus(`working: ${activeRun.promptPreview}`);
    enqueueProgress(0.05, "Pi working");
    enqueueLog("progress", `Started: ${activeRun.promptPreview}`);
  });

  pi.on("turn_start", async () => {
    if (!automationEnabled || !activeRun) {
      return;
    }

    activeRun.turnCount += 1;
    const progress = calculateAutomationProgress(activeRun);
    const turnLabel = activeRun.lastToolName
      ? `Turn ${activeRun.turnCount} (${activeRun.lastToolName})`
      : `Turn ${activeRun.turnCount}`;

    enqueueStatus(turnLabel.toLowerCase());
    enqueueProgress(progress, turnLabel);
  });

  pi.on("tool_execution_start", async (event) => {
    if (!automationEnabled || !activeRun) {
      return;
    }

    activeRun.toolCount += 1;
    activeRun.lastToolName = event.toolName;

    const progress = calculateAutomationProgress(activeRun);
    enqueueStatus(`tool: ${event.toolName}`);
    enqueueProgress(progress, `Tool ${activeRun.toolCount}: ${event.toolName}`);
  });

  pi.on("tool_execution_end", async (event) => {
    if (!automationEnabled || !activeRun) {
      return;
    }


    const progress = calculateAutomationProgress(activeRun);
    enqueueProgress(progress, `Tool done: ${event.toolName}`);
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!automationEnabled || !activeRun) {
      return;
    }

    const durationMs = Date.now() - activeRun.startedAtMs;

    if (!ctx.isIdle() || ctx.hasPendingMessages()) {
      enqueueStatus("follow-up queued");
      enqueueProgress(Math.min(0.96, calculateAutomationProgress(activeRun) + 0.04), "Follow-up queued");
      return;
    }

    const summary = formatCompletionSummary(activeRun, durationMs);

    enqueueClearProgress();
    enqueueStatus("ready");
    enqueueLog("success", `Completed: ${summary}`);

    if (shouldNotifyCompletion(activeRun, durationMs)) {
      const title = "Pi completed";
      enqueueNotification(title);
    }

    resetAutomationState();
  });

  pi.on("session_shutdown", async () => {
    if (!automationEnabled) {
      return;
    }

    enqueueClearProgress();
    enqueueClearStatus();
  });

  pi.registerTool({
    name: "cmux_inspect",
    label: "cmux Inspect",
    description:
      "Inspect cmux runtime state: capabilities, focused workspace/surface context, panes, notifications, and terminal screen capture.",
    parameters: InspectSchema,
    async execute(_toolCallId, params, signal) {
      const input = params as InspectInput;
      const { args, outputStrategy } = buildInspectArgs(input);
      const result = await runCmux(pi, args, signal, outputStrategy);
      ensureSuccess(result);

      return {
        content: [{ type: "text", text: `Inspect action \"${input.action}\" completed.\n\n${formatCommandOutput(result)}` }],
        details: {
          action: input.action,
          outputLimit: CMUX_OUTPUT_LIMIT,
          ...toCommandDetails(result),
        },
      };
    },
  });
}
