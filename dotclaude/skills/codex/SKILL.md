---
name: codex
description: Use when consulting Codex (OpenAI's coding agent) from Claude Code: getting a second opinion on a complex design or approach, when you are stuck on a hard problem, or for an independent code review. Covers how to call the codex MCP tool with the right model and thinking level, and how to weigh Codex's nitpicky, paranoid feedback. Invoke with /codex.
user-invocable: true
---

# Working with Codex

Codex is OpenAI's coding agent, reachable in this session through the
`mcp__codex__codex` MCP tool (start a thread) and `mcp__codex__codex-reply`
(continue one). Treat it as a second set of eyes, not an oracle.

## Pick the thinking level

Every Codex call uses **gpt-5.5**. Default to **high** thinking:

- `model: "gpt-5.5"`
- `config: { model_reasoning_effort: "high" }`

Use **xhigh** thinking when asking Codex about approaches or complex problems:

- `config: { model_reasoning_effort: "xhigh" }`

Use xhigh for architecture or design tradeoffs, implementation strategy,
root-cause analysis, hard debugging, and any problem where the useful answer is
the reasoning path. Keep high for routine code review, sanity checks, and
focused second opinions.

Continue an existing thread with `mcp__codex__codex-reply`, passing the
`threadId` from the first response, so Codex keeps its context instead of
starting cold.

For advice and review, start Codex in `sandbox: "read-only"`: it only needs to
read the code to weigh in. Reach for `workspace-write` only when you actually
want Codex to edit files.

## When to reach for it

Consider a Codex pass on your own initiative, without waiting to be asked, when:

- **A complex idea needs a second opinion.** Non-trivial design or architecture
  calls, tricky tradeoffs, anything where an independent take is worth the round
  trip.
- **You are stuck.** A bug you cannot pin down, a test that will not pass,
  behavior you cannot explain. Hand Codex the problem along with your current
  thinking.
- **A change wants review.** Before finalizing meaningful work, ask Codex to
  review the diff for bugs, edge cases, and anything you missed.

Give it enough to be useful: the goal, the relevant files or diff, what you
already tried, and the specific question.

## How to weigh what it says

Codex is nitpicky and paranoid by nature. That is the point (it surfaces things
a friendlier reviewer glosses over), but it also means:

- **Do not take its output as truth.** It flags plenty that is wrong, out of
  scope, or not worth fixing.
- **Do genuinely consider every point.** Read each suggestion on its merits and
  decide deliberately. Waving feedback off because it is inconvenient defeats the
  purpose of asking.
- **Verify before acting.** Confirm a flagged bug is real and a proposed fix is
  correct before you change anything.

You own the final call. Use Codex to pressure-test it, not to make it for you.
