#!/usr/bin/env node
//
// .claude/bootstrap.mjs: the per-session half of the Claude Code environment setup.
//
// WHAT THIS IS
//   The cheap, runs-every-time half of bootstrapping a session. It is wired as
//   a SessionStart hook in .claude/settings.json and runs on every session
//   start and resume, BOTH locally and in Claude Code on the web, on macOS,
//   Linux, and Windows. The other half (cloud-setup.sh, the cloud "Setup
//   script") does the cloud-only, root/apt toolchain install before Claude Code
//   launches; this does the fast, cross-platform per-session work.
//
//   Node specifically: Claude Code itself runs on Node, so `node` is guaranteed
//   present on every platform with no extra toolchain and no compile step. Keep
//   this file Node + standard library only: no dependencies, no build.
//
// STEP GATING
//   There is no blanket "cloud only" guard. Each step decides for itself
//   whether it applies, so the same file is correct everywhere:
//     - writeEnvVars()    runs only in the cloud (needs $CLAUDE_ENV_FILE).
//     - dockerComposeUp() runs only if the repo actually has a compose file.
//     - installDeps()     runs only for the package managers the repo uses.
//   Copying this file into a repo with no compose stack and no package manifest
//   leaves only writeEnvVars() doing anything; the other two detect that no
//   matching file exists and cleanly no-op. That's the point: the file is
//   correct unedited, and you only fill in the env vars you actually need.
//
//   The script never fails a session: steps log and continue on error.

import { existsSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the repo root from this file's own location (<root>/.claude/bootstrap.mjs)
// rather than from process.cwd(). SessionStart hooks are invoked from the
// session's working directory, which is normally the repo root but is not
// guaranteed to be (see references/gotchas.md). Anchoring on import.meta.url
// makes every file operation below correct regardless of cwd.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const isCloud = process.env.CLAUDE_CODE_REMOTE === "true";
const log = (msg) => console.log(`[bootstrap] ${msg}`);

// --- Step 1: env vars (cloud only) -----------------------------------------
// Cloud sessions persist env vars for later Bash tool calls by appending
// `export` lines to the file named by $CLAUDE_ENV_FILE. Locally there is no
// such file, so this step self-gates off. Put only NON-SECRET defaults here;
// real secrets (e.g. a token) belong in the cloud environment object, which is
// the only place they stay out of git. See references/environment.md.
function writeEnvVars() {
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (!isCloud || !envFile) {
    log("env vars: not a cloud session (no $CLAUDE_ENV_FILE); skipping.");
    return;
  }
  // Replace these with the repo's real, non-secret dev defaults (region, feature
  // flags, a service URL pointing at a compose service, etc.). Leave the object
  // empty if the repo needs none. Example:
  const vars = {
    // EXAMPLE_REGION: "us-west-1",
    // DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app_dev",
  };
  const entries = Object.entries(vars);
  if (entries.length === 0) {
    log("env vars: none configured; skipping.");
    return;
  }
  const lines = entries.map(([k, v]) => `export ${k}=${v}`);
  appendFileSync(envFile, lines.join("\n") + "\n");
  log(`env vars: wrote ${Object.keys(vars).join(", ")} to $CLAUDE_ENV_FILE.`);
}

// --- Step 2: docker compose (only if the repo has a compose stack) ----------
// Reusable pattern step. If the repo has no compose file, it no-ops.
function dockerComposeUp() {
  const candidates = [
    "compose.yaml",
    "compose.yml",
    "docker-compose.yaml",
    "docker-compose.yml",
  ];
  const found = candidates.find((f) => existsSync(join(repoRoot, f)));
  if (!found) {
    log("docker compose: no compose file in repo; skipping.");
    return;
  }
  try {
    execFileSync("docker", ["compose", "up", "-d", "--wait"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    log(`docker compose: brought up services from ${found}.`);
  } catch (err) {
    log(`docker compose: failed (${err.message}); continuing.`);
  }
}

// --- Step 3: project dependencies (only for managers the repo uses) ---------
// Reusable pattern step. Detects the package manifests present and runs the
// matching install; if the repo has none, it no-ops.
function installDeps() {
  const managers = [
    { manifest: "package.json", cmd: ["npm", "install"] },
    { manifest: "Cargo.toml", cmd: ["cargo", "fetch"] },
    { manifest: "go.mod", cmd: ["go", "mod", "download"] },
    { manifest: "requirements.txt", cmd: ["pip", "install", "-r", "requirements.txt"] },
    { manifest: "Gemfile", cmd: ["bundle", "install"] },
  ];
  const ran = managers.filter(({ manifest }) => existsSync(join(repoRoot, manifest)));
  if (ran.length === 0) {
    log("deps: no recognized package manifest in repo; skipping.");
    return;
  }
  for (const { manifest, cmd } of ran) {
    try {
      execFileSync(cmd[0], cmd.slice(1), { cwd: repoRoot, stdio: "inherit" });
      log(`deps: installed for ${manifest}.`);
    } catch (err) {
      log(`deps: ${cmd[0]} failed for ${manifest} (${err.message}); continuing.`);
    }
  }
}

log(`starting (${isCloud ? "cloud" : "local"} session, root ${repoRoot}).`);
writeEnvVars();
dockerComposeUp();
installDeps();
log("done.");
