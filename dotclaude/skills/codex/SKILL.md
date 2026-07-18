---
name: codex
description: Use when working with Codex (OpenAI's coding agent) from Claude Code for hands-on implementation, debugging, design consultation, or independent review. Covers how to call the Codex MCP tool, shape a useful handoff, and verify the result.
user-invocable: true
---

# Working with Codex

Codex is OpenAI's coding agent, reachable in this session through the
`mcp__codex__codex` MCP tool (start a thread) and `mcp__codex__codex-reply`
(continue one). You retain responsibility for scope, review, and integration.

Treat gpt-5.6-sol as Fable's peer. Share decision context and invite it to
challenge weak assumptions. Delegation assigns hands-on work while both models
contribute judgment and review each other's conclusions.

## Pick the thinking level

Every Codex call uses **gpt-5.6-sol**. Default to **medium** thinking:

- `model: "gpt-5.6-sol"`
- `config: { model_reasoning_effort: "medium" }`

Scale up to **high** thinking for harder tasks:

- `config: { model_reasoning_effort: "high" }`

Use high for architecture or design tradeoffs, implementation strategy,
root-cause analysis, hard debugging, and tasks that require sustained reasoning
across several files or constraints. Keep medium for routine implementation,
code review, sanity checks, and focused second opinions.

## Shape the handoff

Keep the prompt lean. State the outcome, relevant context, constraints,
required evidence, success criteria, and expected output. State each instruction
once, and do not repeat durable rules Codex can read from the repository's
instruction files.

Set the authorization boundary explicitly:

- For explanation, review, diagnosis, or planning, use `sandbox: "read-only"`
  and ask Codex to inspect the relevant material and report its findings without
  editing files.
- For changes, builds, or fixes, use `sandbox: "workspace-write"` and authorize
  the requested in-scope edits and relevant non-destructive validation.
- Require confirmation before external writes, destructive actions, or a
  material expansion of scope.

Point Codex to relevant files, diffs, and prior attempts when they narrow the
search. Let it inspect the codebase and choose implementation details unless a
specific approach is part of the requirement.

## When to reach for it

Reach for Codex on your own initiative when:

- **A change needs implementation.** Give Codex a bounded outcome and success
  criteria, then let it make the in-scope changes and run the relevant checks.
- **A complex idea needs a second opinion.** Ask it to evaluate the design,
  tradeoffs, and failure modes against explicit criteria.
- **You are stuck.** A bug you cannot pin down, a test that will not pass,
  behavior you cannot explain. Hand Codex the problem along with your current
  thinking.
- **A meaningful change needs review.** Before finalizing it, ask Codex to
  review the diff for bugs, edge cases, and anything you missed.

## Close the loop

For implementation, inspect the resulting diff and test evidence against the
success criteria. When corrections are needed, call
`mcp__codex__codex-reply` with the original `threadId` so Codex retains the
implementation context.

For advice and review, verify each finding's evidence and decide whether it is
correct and in scope before acting.
