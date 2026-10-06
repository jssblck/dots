import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hook = process.env.HOOK_PATH || fileURLToPath(new URL("../dotclaude/hooks/branch-staleness.mjs", import.meta.url));
const runtime = process.env.HOOK_RUNTIME || process.execPath;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function invoke(cwd, event, command = "gh pr create --title 'review'") {
  return execFileSync(runtime, [hook], {
    input: JSON.stringify({ cwd, hook_event_name: event, tool_input: { command } }),
    encoding: "utf8",
  });
}

test("real Git startup and pre-PR observations respect review and conflict policy", () => {
  const directory = mkdtempSync(join(tmpdir(), "branch-staleness-"));
  try {
    const origin = join(directory, "origin.git");
    const writer = join(directory, "writer");
    const review = join(directory, "review");
    const conflict = join(directory, "conflict");
    git(directory, "init", "--bare", origin);
    git(directory, "init", "--initial-branch=main", writer);
    git(writer, "config", "user.name", "Grace Hopper");
    git(writer, "config", "user.email", "grace@example.invalid");
    writeFileSync(join(writer, "AGENTS.md"), "Read-only reviews never mutate branches. Update onto main only when GitHub reports a conflict.\n");
    writeFileSync(join(writer, "shared.txt"), "base\n");
    git(writer, "add", ".");
    git(writer, "commit", "-m", "Initial policy and content");
    git(writer, "remote", "add", "origin", origin);
    git(writer, "push", "origin", "main");
    git(directory, "--git-dir", origin, "symbolic-ref", "HEAD", "refs/heads/main");
    git(writer, "worktree", "add", "-b", "read-only-review", review);
    git(writer, "worktree", "add", "-b", "actual-conflict", conflict);
    writeFileSync(join(review, "feature.txt"), "Independent feature\n");
    git(review, "add", ".");
    git(review, "commit", "-m", "Add clean feature change");
    writeFileSync(join(review, "review-notes.txt"), "Keep the reviewer's notes\n");
    writeFileSync(join(conflict, "shared.txt"), "branch change\n");
    git(conflict, "add", ".");
    git(conflict, "commit", "-m", "Change shared line");
    writeFileSync(join(writer, "shared.txt"), "main change\n");
    git(writer, "add", ".");
    git(writer, "commit", "-m", "Advance main");
    git(writer, "push", "origin", "main");

    assert.doesNotThrow(() => git(review, "merge-tree", "--write-tree", "HEAD", "origin/main"));
    assert.throws(() => git(conflict, "merge-tree", "--write-tree", "HEAD", "origin/main"));
    for (const cwd of [review, conflict]) {
      const before = { head: git(cwd, "rev-parse", "HEAD"), status: git(cwd, "status", "--porcelain") };
      for (const event of ["SessionStart", "PreToolUse"]) {
        const result = JSON.parse(invoke(cwd, event));
        assert.equal(result.hookSpecificOutput.hookEventName, event);
        const context = result.hookSpecificOutput.additionalContext;
        assert.match(context, /1 commit behind origin\/main/);
        assert.match(context, /repository and session/i);
        assert.match(context, /read-only/i);
        assert.match(context, /reports.*conflict.*workflow/i);
        assert.doesNotMatch(context, /By default|autostash|force-push|Do this proactively|rebase (?:this branch|onto)/);
      }
      assert.deepEqual({ head: git(cwd, "rev-parse", "HEAD"), status: git(cwd, "status", "--porcelain") }, before);
    }

    // Unrelated repositories still receive the distance observation, and their
    // configured opt-out stays silent at both supported hook boundaries.
    git(review, "config", "claude.branchStaleness.disabled", "true");
    for (const event of ["SessionStart", "PreToolUse"]) assert.equal(invoke(review, event), "");
    git(review, "config", "--unset", "claude.branchStaleness.disabled");
    assert.equal(invoke(review, "PreToolUse", 'git commit -m "gh pr create"'), "");
    assert.equal(invoke(writer, "SessionStart"), "");
    for (const url of ["git@github.com:jssblck/dots.git", "https://github.com/jssblck/dots"]) {
      git(writer, "remote", "set-url", "origin", url);
      assert.equal(invoke(review, "SessionStart"), "");
      assert.equal(invoke(review, "PreToolUse"), "");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
