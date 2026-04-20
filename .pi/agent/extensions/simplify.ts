/**
 * /simplify - Post-implementation code cleanup command
 *
 * Inspired by Claude Code's /simplify. Analyzes your recent changes via git diff
 * and applies targeted improvements for clarity, consistency, and maintainability
 * while preserving all original functionality.
 *
 * Usage:
 *   /simplify                          - simplify all changes (uncommitted + branch)
 *   /simplify focus on error handling  - simplify with a specific focus
 *   /simplify --staged                 - only simplify staged changes
 *
 * Change detection order:
 *   1. Uncommitted changes (staged + unstaged + untracked)
 *   2. Branch changes vs merge-base with main/master
 *   Both are included when present.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

async function git(pi: ExtensionAPI, ...args: string[]) {
    return pi.exec("git", args);
}

export default function (pi: ExtensionAPI) {
    pi.registerCommand("simplify", {
        description: "Simplify recently changed code (a la Claude Code)",
        handler: async (args, ctx) => {
            if (!ctx.isIdle()) {
                ctx.ui.notify("Agent is busy. Wait for it to finish first.", "warning");
                return;
            }

            // Detect --staged flag
            const stagedOnly = args.includes("--staged");
            const focus = args.replace(/--staged/g, "").trim();

            if (stagedOnly) {
                const { stdout } = await git(pi, "diff", "--staged", "--stat");
                if (!stdout.trim()) {
                    ctx.ui.notify("No staged changes found.", "info");
                    return;
                }
                sendPrompt(pi, "staged changes", "git diff --staged", focus);
                return;
            }

            // Collect all sources of changes
            const sources: Array<{ label: string; command: string }> = [];

            // 1. Uncommitted changes (vs HEAD)
            const { stdout: headStat } = await git(pi, "diff", "HEAD", "--stat");
            if (headStat.trim()) {
                sources.push({ label: "uncommitted changes", command: "git diff HEAD" });
            } else {
                // Maybe unstaged only (no commits yet, or index tricks)
                const { stdout: unstaged } = await git(pi, "diff", "--stat");
                if (unstaged.trim()) {
                    sources.push({ label: "unstaged changes", command: "git diff" });
                }
                // Untracked files
                const { stdout: untracked } = await git(
                    pi, "ls-files", "--others", "--exclude-standard",
                );
                if (untracked.trim()) {
                    sources.push({
                        label: "new untracked files",
                        command: "git ls-files --others --exclude-standard",
                    });
                }
            }

            // 2. Branch changes vs default branch merge-base
            const { stdout: currentBranch } = await git(
                pi, "rev-parse", "--abbrev-ref", "HEAD",
            );
            const branch = currentBranch.trim();

            if (branch !== "main" && branch !== "master") {
                // Find the default branch
                const { stdout: defaultRef } = await git(
                    pi, "symbolic-ref", "refs/remotes/origin/HEAD",
                );
                let defaultBranch = defaultRef.trim().replace("refs/remotes/origin/", "");
                if (!defaultBranch) {
                    // Fallback: check if main or master exists
                    const { code: mainCode } = await git(
                        pi, "rev-parse", "--verify", "main",
                    );
                    const { code: masterCode } = await git(
                        pi, "rev-parse", "--verify", "master",
                    );
                    if (mainCode === 0) defaultBranch = "main";
                    else if (masterCode === 0) defaultBranch = "master";
                }

                if (defaultBranch) {
                    const { stdout: mergeBase, code } = await git(
                        pi, "merge-base", defaultBranch, "HEAD",
                    );
                    if (code === 0 && mergeBase.trim()) {
                        const base = mergeBase.trim();
                        const { stdout: branchStat } = await git(
                            pi, "diff", `${base}...HEAD`, "--stat",
                        );
                        if (branchStat.trim()) {
                            sources.push({
                                label: `branch changes vs ${defaultBranch}`,
                                command: `git diff $(git merge-base ${defaultBranch} HEAD)...HEAD`,
                            });
                        }
                    }
                }
            }

            if (sources.length === 0) {
                ctx.ui.notify("No changes found to simplify.", "info");
                return;
            }

            // Build combined description
            const diffSource = sources.map((s) => s.label).join(" + ");
            const commands = sources.map((s) => `\`${s.command}\``).join(", then ");

            sendPrompt(pi, diffSource, commands, focus);
        },
    });
}

function sendPrompt(
    pi: ExtensionAPI,
    diffSource: string,
    diffCommands: string,
    focus: string,
) {
    const focusLine = focus ? `\n\nAdditional focus: ${focus}` : "";

    const prompt = `Review and simplify my ${diffSource}. Start by running ${diffCommands} to see what changed, then read the full files for context.

Apply targeted improvements across three dimensions. If you have an agents/subagent tool available, consider running these as parallel tasks and then aggregating the results into a single set of edits. Otherwise, work through them sequentially.

1. **Code Reuse** - Eliminate duplicated logic, extract shared patterns, replace hand-rolled code with existing utilities or helpers already in the codebase.

2. **Code Quality** - Flatten deeply nested conditionals, improve variable/function naming for clarity, remove redundant state or parameters, strip obvious comments that don't add value, fix structural inconsistencies.

3. **Efficiency** - Remove unnecessary work, simplify overly verbose logic, replace redundant operations, flatten unnecessary abstractions that don't earn their keep.

Rules:
- **Preserve all external behavior** - never change what the code does, only how it's structured.
- **Edit files directly** - apply fixes, don't just list suggestions.
- **Stay scoped** - only touch code that was recently changed (in the diff). Don't refactor unrelated code.
- **Be surgical** - make the smallest changes that achieve clarity. Don't rewrite for the sake of rewriting.
- **Respect project conventions** - follow existing patterns, naming styles, and formatting.

After applying changes, give a brief summary of what you simplified and why.${focusLine}`;

    pi.sendUserMessage(prompt);
}
