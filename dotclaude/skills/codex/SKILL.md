---
name: codex
description: Use when working with Codex (OpenAI's coding agent) from Claude Code for hands-on implementation, debugging, design consultation, or independent review, or when deciding whether to delegate coding work and to which model. Covers the model routing policy (Fable vs Opus 5 vs gpt-5.6-sol vs gpt-5.6-terra, and what to keep in-session), how to call the Codex MCP tool, shape a useful handoff, and verify the result.
user-invocable: true
---

# Working with Codex

Codex is OpenAI's coding agent, reachable in this session through the
`mcp__codex__codex` MCP tool (start a thread) and `mcp__codex__codex-reply`
(continue one). You retain responsibility for scope, review, and integration.

Treat gpt-5.6-sol as a peer, not a subordinate. Share decision context and invite
it to challenge weak assumptions. Delegation assigns hands-on work while both
models contribute judgment and review each other's conclusions.

## Division of labor

Fable is the big-picture model: decomposition, specification, design judgment,
review, integration. Opus 5 and gpt-5.6-sol are its implementation peers, and
either can take hands-on coding work unsupervised. Opus 5 has somewhat more
taste; sol has somewhat more grit and is the better choice for computer use.

- **Fable is running the session.** Delegate implementation to sol by default and
  keep the big-picture work. Do it yourself when the change is tightly
  cross-cutting, or small enough that the handoff costs more than the work.
- **Opus 5 is running the session.** Implement it yourself. Reach for sol when
  the task rewards grit over taste (long mechanical grinds, stubborn debugging,
  anything needing many iterations to converge), when it needs computer use, or
  when a meaningful change wants an independent review.

Haiku and Sonnet subagents are for exploration, not for work that ships.

Either way you own the result, and delegated work is held to the same bar as
your own.

## Pick the model

Within Codex, default to **gpt-5.6-sol**. Use **gpt-5.6-terra** when the work
should be cheap and fast and a weaker model can still clear the bar.

Rankings, higher is better. Cost is effective cost to Jess, not list price.
Intelligence is how hard a problem the model takes unsupervised. Taste covers
UI/UX, code quality, API design, and copy.

| model         | cost | intelligence | taste |
|---------------|------|--------------|-------|
| opus-5        | 7    | 9            | 7     |
| gpt-5.6-sol   | 7    | 9            | 6     |
| gpt-5.6-terra | 9    | 7            | 5     |
| fable-5       | 2    | 9            | 9     |

Cost is a tie-breaker only: when the axes conflict on anything that ships,
intelligence beats taste beats cost. These are defaults rather than limits, so
rerun or redo the work on a stronger model without asking when the output misses
the bar.

Opus 5 and sol tie on every axis here except taste, so the table on its own
would always pick Opus. It does not rank grit or computer use, and those are
what actually separate the two; route on the division of labor above instead.

## Pick the thinking level

Default to **medium** thinking:

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
