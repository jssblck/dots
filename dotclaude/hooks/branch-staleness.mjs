#!/usr/bin/env bun
// branch-staleness.mjs: surface "this branch has drifted from its base" into
// Claude's context, the same way a failing CI check surfaces: by injecting text
// the model actually reads.
//
// The problem this solves: Claude notices CI failures because they land in the
// context as tool output. Branch staleness (feature branch is N commits behind
// main) is otherwise invisible state. This hook reports that distance through
// `additionalContext`; repository and session policy own any branch update.
//
// Wired to two events in settings.json (both invoke this one script; it
// dispatches on the hook event name from stdin):
//   - SessionStart: check once at the top of every session / resume / clear.
//   - PreToolUse(Bash): re-check at the exact moment a PR is opened, since a
//                        long session can drift after it started. Fast-exits for
//                        every Bash command that is not `gh pr create`, so the
//                        git fetch cost is only paid when it matters.
//
// Cross-platform: pure Bun + git. Invoked as `bun .../branch-staleness.mjs`, so
// the shebang is decorative; the forward-slash path works on Windows too.
//
// Failure policy: this is advisory. Any error (not a repo, offline, no base ref,
// git missing) exits 0 with no output. A staleness hook must never break a
// session or block a command on its own malfunction.

import { execFileSync } from "node:child_process";

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
  // Malformed payload: nothing actionable, stay silent.
  process.exit(0);
}

const event = payload.hook_event_name ?? "";
// Run git in the session's project directory, not wherever the hook launched.
const cwd = payload.cwd || process.cwd();

// A PreToolUse check is only relevant right before a PR is opened. Bail fast on
// every other Bash command so we never add latency to unrelated work.
//
// Match `gh pr create` only at a command position: the start of the string or
// right after a shell separator (`;`, `|`, `&`, newline) or an opening subshell.
// A bare substring match also fires on the phrase inside a quoted argument, e.g.
// a `git commit -m "...gh pr create..."`, which is a false positive. Anchoring
// to a command boundary (note: backtick and quote are deliberately not
// boundaries) drops that noise while still catching every real invocation.
if (event === "PreToolUse") {
  const command = payload.tool_input?.command ?? "";
  if (!/(?:^|[\n;|&(])\s*gh\s+pr\s+create\b/.test(command)) process.exit(0);
}

// ── Git helpers (all silent-on-failure) ──────────────────────────────────────

/** Run a git command in `cwd`; return trimmed stdout, or null on any failure. */
function git(args, { timeout = 8000 } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      timeout,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

// Only operate inside a work tree.
if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") process.exit(0);

// Per-repo opt-out. Some repos don't derive their branches from a single base:
// a dotfiles repo with a branch per machine (macos, arch, agents), for example,
// where "N commits behind main" is meaningless.
// Disable the check there with:
//   git config claude.branchStaleness.disabled true
const optOut = git(["config", "--get", "claude.branchStaleness.disabled"]);
if (optOut && /^(1|true|yes|on)$/i.test(optOut)) process.exit(0);

// This dotfiles repo is one such case (a branch per machine: macos, arch,
// agents), so opt it out by origin too. That way every clone is covered without
// the per-clone git config. Matches SSH and HTTPS remote URLs, with or without
// the trailing `.git`.
const origin = git(["remote", "get-url", "origin"]) ?? "";
if (/[:/]jssblck\/dots(?:\.git)?\/?$/i.test(origin)) process.exit(0);

// Resolve the base branch: prefer origin/HEAD (the remote's default branch),
// then fall back to main, then master. This is the branch we measure drift from.
function resolveBase() {
  const head = git(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]);
  if (head) return head.replace("refs/remotes/origin/", "");
  for (const candidate of ["main", "master"]) {
    if (git(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${candidate}`]) !== null) {
      return candidate;
    }
  }
  return null;
}

const base = resolveBase();
if (!base) process.exit(0);

// Don't nag when the checked-out branch *is* the base: this feature is about
// feature/worktree branches drifting, not about the base trailing its remote.
const current = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (!current || current === base) process.exit(0);

// Refresh just the base ref so the count reflects the real remote. Best-effort:
// offline or slow networks fall through to the last-fetched ref rather than
// blocking the session.
git(["fetch", "--quiet", "origin", base], { timeout: 6000 });

const ref = `origin/${base}`;
if (git(["rev-parse", "--verify", "--quiet", ref]) === null) process.exit(0);

// Commits on the base that this branch does not have = how far behind we are.
const behindRaw = git(["rev-list", "--count", `HEAD..${ref}`]);
const behind = Number(behindRaw);
if (!Number.isFinite(behind) || behind <= 0) process.exit(0);

// ── Emit context ─────────────────────────────────────────────────────────────

const plural = behind === 1 ? "commit" : "commits";
const timing = event === "PreToolUse" ? " This check ran before opening a PR." : "";
const context =
  `Branch staleness check: the current branch "${current}" is ${behind} ${plural} behind ${ref}.${timing} ` +
  `Commit distance alone does not establish a merge conflict. Follow explicit repository and session ` +
  `policy for branch updates. In a read-only review, report observations without changing the checkout. ` +
  `If the hosting service reports a PR conflict, follow the repository's supported conflict workflow.`;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: event || "SessionStart",
      additionalContext: context,
    },
  }),
);
