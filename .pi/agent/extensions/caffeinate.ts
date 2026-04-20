import { spawn, type ChildProcess } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function isRunning(processHandle: ChildProcess | null): processHandle is ChildProcess {
	if (!processHandle) return false;
	return processHandle.exitCode === null && processHandle.signalCode === null;
}

export default function (_pi: ExtensionAPI) {
	let caffeinateProcess: ChildProcess | null = null;

	function stopCaffeinate() {
		if (!caffeinateProcess) return;

		const runningProcess = caffeinateProcess;
		caffeinateProcess = null;

		if (runningProcess.exitCode === null && runningProcess.signalCode === null) {
			runningProcess.kill("SIGTERM");
		}
	}

	function startCaffeinate() {
		if (process.platform !== "darwin") {
			return;
		}

		if (isRunning(caffeinateProcess)) {
			return;
		}

		const child = spawn("caffeinate", [], {
			stdio: "ignore",
		});

		caffeinateProcess = child;

		child.once("exit", () => {
			if (caffeinateProcess?.pid === child.pid) {
				caffeinateProcess = null;
			}
		});

		child.once("error", () => {
			if (caffeinateProcess?.pid === child.pid) {
				caffeinateProcess = null;
			}
		});
	}

	_pi.on("agent_start", async () => {
		startCaffeinate();
	});

	_pi.on("agent_end", async (_event, ctx) => {
		if (!ctx.isIdle() || ctx.hasPendingMessages()) {
			return;
		}

		stopCaffeinate();
	});

	_pi.on("session_shutdown", async () => {
		stopCaffeinate();
	});
}
