#!/usr/bin/env bun
// eph-clean.mjs: when Claude Code removes a git worktree, tear down that
// worktree's ephemeral services before the directory disappears.
//
// `eph` (https://github.com/jssblck/eph) manages per-workspace ephemeral
// services, defined by a `.eph` file at the workspace root ("dotenv for
// services"). A worktree that ran `eph up` leaves docker services, named
// volumes, and persisted state behind; deleting the worktree directory does not
// stop them, so they leak. `eph clean` stops and removes all of that for the
// workspace it runs in.
//
// Wired to WorktreeRemove in settings.json. That event fires while the worktree
// is still on disk, so the teardown lands before the directory is deleted.
//
// Fail-closed and best-effort by design:
//   - Do nothing unless `eph` is on PATH. Trying to spawn it and catching the
//     spawn error is the portable "is it installed" check (no which/where
//     branching), and it costs nothing when eph is absent.
//   - Act only on the explicit `worktree_path` from the payload, never on `cwd`.
//     `cwd` is the parent/main checkout, so a malformed payload must never let
//     us clean the main workspace.
//   - Act only when that worktree has its OWN `.eph` at its root. eph resolves
//     `.eph` by walking up parent directories, so a worktree that never used
//     eph would otherwise tear down a PARENT workspace's services. We only ever
//     clean a worktree that is itself an eph workspace.
//   - Never throw and never exit non-zero on eph's account. WorktreeRemove
//     cannot block removal anyway; a cleanup hook must not be what breaks a
//     session.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// ── Read the hook payload from stdin ─────────────────────────────────────────

const stdin = await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (data += c));
  process.stdin.on("end", () => resolve(data));
  // If nothing is piped in (manual run), don't hang.
  if (process.stdin.isTTY) resolve("");
});

let payload = {};
try {
  payload = JSON.parse(stdin || "{}");
} catch {
  process.exit(0);
}

// The absolute path of the worktree being removed. Only an explicit worktree
// path is trusted: falling back to `cwd` (the parent checkout) could make a
// stray payload clean the main workspace, so a missing path means do nothing.
const worktree = payload.worktree_path;
if (!worktree) process.exit(0);

// Only clean a worktree that is itself an eph workspace (its own `.eph` at the
// root), so we never reach up into a parent workspace's services.
if (!existsSync(join(worktree, ".eph"))) process.exit(0);

// Best-effort teardown. Swallow everything: eph not installed (ENOENT), a
// failing `eph clean`, or a timeout must not break worktree removal. The
// generous timeout accommodates docker service and volume teardown.
try {
  execFileSync("eph", ["clean"], {
    cwd: worktree,
    timeout: 120_000,
    stdio: ["ignore", "ignore", "ignore"],
  });
} catch {
  // Advisory only: nothing actionable to report, and nowhere useful to report it.
}

process.exit(0);
