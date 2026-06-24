#!/usr/bin/env bun
// Claude Code statusLine command — emulates starship's "Plain Text Symbols" preset.
// Receives JSON on stdin; outputs a single ANSI-coloured status line (no trailing newline).
// macOS/Bun port of statusline-command.ps1 (kept behaviourally identical).
//
// Rendered modules (left to right):
//   1. Directory   — bold cyan, home collapsed to ~, forward slashes,
//                    truncated to last 3 components (prefix …/ when truncated)
//   2. Git branch  — "on " plain + bold magenta: "git <branch>"
//   3. Git status  — bold red: [?!+x r >N <N = $] when dirty, omitted when clean
//   4. Context     — dim: "47.2k ctx" (tokens currently in the context window)
//   5. Cache       — bold yellow: "uncached" when idle past the prompt-cache TTL
//                    (so the next message will be sent fully uncached)
//   6. Model hint  — dim: (Claude Sonnet 4.5)

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const ESC = "\x1b";
const RESET = `${ESC}[0m`;
const BOLD_CYAN = `${ESC}[1;36m`;
const BOLD_MAG = `${ESC}[1;35m`;
const BOLD_RED = `${ESC}[1;31m`;
const BOLD_YELL = `${ESC}[1;33m`;
const DIM = `${ESC}[2m`;

// ── Read stdin JSON ──────────────────────────────────────────────────────────

const stdin = await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (data += c));
  process.stdin.on("end", () => resolve(data));
});

let json = {};
try {
  json = JSON.parse(stdin);
} catch {}

let cwd = json.cwd;
if (!cwd) cwd = json.workspace?.current_dir;
cwd = cwd || process.cwd();

const transcript = json.transcript_path;

// ── Module 1: Directory ──────────────────────────────────────────────────────
// Collapse home, convert to forward slashes, truncate to last 3 components.

const homePath = homedir();

// Normalise both to forward slashes for consistent handling
let cwdFwd = cwd.replace(/\\/g, "/");
const homeFwd = homePath.replace(/\\/g, "/");

// Replace leading home path with ~
if (cwdFwd.toLowerCase().startsWith(homeFwd.toLowerCase())) {
  const rel = cwdFwd.slice(homeFwd.length).replace(/^\/+/, "");
  cwdFwd = rel ? `~/${rel}` : "~";
}

// Truncate to 3 path components (starship default truncation_length=3).
// A leading ~ is a fixed anchor that doesn't count toward the 3 components.
let dirText;
if (cwdFwd.startsWith("~")) {
  const allParts = cwdFwd.split("/");
  if (allParts.length > 4) {
    dirText = `…/${allParts.slice(-3).join("/")}`;
  } else {
    dirText = cwdFwd;
  }
} else {
  const allParts = cwdFwd.split("/");
  if (allParts.length > 3) {
    dirText = `…/${allParts.slice(-3).join("/")}`;
  } else {
    dirText = cwdFwd;
  }
}

const dirSegment = `${BOLD_CYAN}${dirText}${RESET}`;

// ── Git information ──────────────────────────────────────────────────────────

let branch = null;
let ahead = 0;
let behind = 0;
let staged = 0; // any staged change
let modified = 0; // unstaged modified
let deleted = 0; // unstaged deleted
let renamed = 0; // staged renamed
let untracked = 0;
let stagedDel = 0; // staged deleted

try {
  // Use --porcelain=v2 so we get ahead/behind counts in one call
  const statusRaw = execFileSync(
    "git",
    ["-C", cwd, "--no-optional-locks", "status", "--porcelain=v2", "--branch"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  for (const line of statusRaw.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      const b = line.slice("# branch.head ".length).trim();
      if (b !== "(detached)") branch = b;
    } else if (line.startsWith("# branch.ab ")) {
      // format: +N -N
      const m = line.match(/\+(\d+)\s+-(\d+)/);
      if (m) {
        ahead = parseInt(m[1], 10);
        behind = parseInt(m[2], 10);
      }
    } else if (line.startsWith("# branch.oid ")) {
      // detached HEAD — try to get a short sha for display
      if (!branch) {
        const sha = line.split(" ").pop();
        branch = sha.slice(0, Math.min(7, sha.length));
      }
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      // ordinary / rename entries: "1 XY ..."  "2 XY ..."
      const xy = line.slice(2, 4);
      const x = xy[0]; // staged
      const y = xy[1]; // unstaged

      if (x !== "." && x !== " ") {
        if (x === "D") stagedDel++;
        else if (x === "R") renamed++;
        else staged++;
      }
      if (y === "M") modified++;
      if (y === "D") deleted++;
    } else if (line.startsWith("? ")) {
      untracked++;
    }
  }
} catch {}

// ── Module 2: Git branch ─────────────────────────────────────────────────────
// → renders as: "on " (unstyled) + bold-magenta "git <branch>"

let branchSegment = "";
if (branch) {
  branchSegment = ` on ${BOLD_MAG}git ${branch}${RESET}`;
}

// ── Module 3: Git status ─────────────────────────────────────────────────────
//   ?  untracked   !  modified   +  staged   x  deleted   r  renamed
//   >N ahead by N  <N behind by N  <> diverged  =  conflicted  $  stashed
// Omit brackets entirely when tree is clean and not ahead/behind.

let statusSegment = "";
if (branch) {
  let sym = "";
  if (untracked > 0) sym += "?";
  if (modified > 0) sym += "!";
  if (staged > 0) sym += "+";
  if (stagedDel > 0 || deleted > 0) sym += "x";
  if (renamed > 0) sym += "r";
  if (ahead > 0 && behind > 0) sym += "<>";
  else if (ahead > 0) sym += `>${ahead}`;
  else if (behind > 0) sym += `<${behind}`;

  if (sym) statusSegment = ` ${BOLD_RED}[${sym}]${RESET}`;
}

// ── Transcript: context size + cache staleness ───────────────────────────────
//   • Context tokens: the full prompt size of the most recent main-chain assistant
//     turn = input + cache_creation + cache_read + output.
//   • Cache staleness: detect 1h vs 5m breakpoint by whether this session ever
//     wrote a 1h cache entry; if idle past that TTL the next message is uncached.

let ctxTokens = null;
let uncached = false;

if (transcript) {
  try {
    const raw = readFileSync(transcript, "utf8");
    const tlines = raw.split("\n").filter((l) => l.length > 0);

    // Effective TTL: 1h if this session uses extended (1h) caching, else 5m.
    let ttlSeconds = 300;
    if (/"ephemeral_1h_input_tokens":\s*[1-9]/.test(raw)) ttlSeconds = 3600;

    // Most recent main-chain assistant usage → current context occupancy.
    for (let i = tlines.length - 1; i >= 0; i--) {
      if (!tlines[i].includes('"usage"')) continue;
      let entry;
      try {
        entry = JSON.parse(tlines[i]);
      } catch {
        continue;
      }
      if (entry.isSidechain === true) continue; // skip subagent turns
      const u = entry.message?.usage;
      if (!u) continue;
      ctxTokens =
        (u.input_tokens | 0) +
        (u.cache_creation_input_tokens | 0) +
        (u.cache_read_input_tokens | 0) +
        (u.output_tokens | 0);
      break;
    }

    // Idle past the cache TTL → next message is fully uncached.
    const mtime = statSync(transcript).mtimeMs;
    if ((Date.now() - mtime) / 1000 > ttlSeconds) uncached = true;
  } catch {}
}

// ── Module 4: Context tokens ─────────────────────────────────────────────────

let ctxSegment = "";
if (ctxTokens !== null) {
  let ctxStr;
  if (ctxTokens >= 1000000) ctxStr = `${(ctxTokens / 1000000).toFixed(1)}M`;
  else if (ctxTokens >= 1000) ctxStr = `${(ctxTokens / 1000).toFixed(1)}k`;
  else ctxStr = `${ctxTokens}`;
  ctxSegment = ` ${DIM}${ctxStr} ctx${RESET}`;
}

// ── Module 5: Cache staleness warning ────────────────────────────────────────

let cacheSegment = "";
if (uncached) cacheSegment = ` ${BOLD_YELL}uncached${RESET}`;

// ── Module 6: Model hint ─────────────────────────────────────────────────────

let modelSegment = "";
const model = json.model?.display_name;
if (model) modelSegment = ` ${DIM}(${model})${RESET}`;

// ── Compose and emit ─────────────────────────────────────────────────────────
// No trailing newline — Claude Code appends its own separator
process.stdout.write(
  `${dirSegment}${branchSegment}${statusSegment}${ctxSegment}${cacheSegment}${modelSegment}`,
);
