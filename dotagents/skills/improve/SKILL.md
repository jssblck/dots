---
name: improve
description: Explore how to improve a codebase with a strong reasoning partner, then preserve the result as a compact intent brief for a later or compacted implementation session. Use for codebase audits, cleanup or architecture brainstorming, feature direction, migrations, and turning a known change into a durable record of intent, contracts, decisions, and unresolved questions.
---

# Improve

Use the codebase to sharpen the user's intent and preserve the reasoning that
would otherwise be lost between sessions. Investigate enough to distinguish
current behavior from desired behavior, think through the consequential design
choices with the user, and leave a compact brief that another strong model can
resume without reconstructing the conversation.

## Workflow

1. **Orient.** Read the repository instructions, relevant product or design
   docs, code, tests, and history. Follow the user's focus, expanding the search
   only when a dependency or contract needs to be understood.
2. **Trace the behavior.** Establish what the system does today and why. Prefer
   direct evidence from code and tests over inventories, generic best practices,
   or category-by-category audits.
3. **Find the decisions.** Surface contradictions, missing semantics, and real
   choices. Present only options that lead to meaningfully different behavior,
   recommend the simplest coherent design, and resolve questions from the
   codebase before asking the user.
4. **Record the result.** Once the direction is stable, write or update one
   brief under `plans/<slug>.md`. If `plans/` already serves another purpose,
   choose a nearby project-appropriate location and say where the brief went.
5. **Carry it forward.** Treat the brief as the source of truth after compaction
   or in the implementation session. Keep it current as decisions change and
   remove superseded reasoning instead of accumulating a history of the debate.

Follow the user's requested phase. A brainstorming request ends with the brief;
an implementation request can use the brief and continue into the change.

## What to preserve

Capture details that determine whether a future implementation is correct:

- The intended outcome and the reason it matters.
- User-visible behavior and domain language.
- Semantic invariants: inputs, outputs, state transitions, ownership, failure
  behavior, and ordering or concurrency rules where relevant.
- Compatibility, migration, security, privacy, and performance requirements
  only when they constrain the design.
- Decisions already made, including the reason when it prevents a likely wrong
  turn later.
- Current implementation facts needed to begin work, with concise file or
  symbol references.
- Open questions only when their answers could change the implementation.

Negative constraints belong in the brief when they express real product or
system behavior, such as data that must never leave a trust boundary. Do not
turn incidental file boundaries or imagined executor mistakes into contracts.

## Brief format

Use only the sections that carry information:

```markdown
# <Desired outcome>

## Intent
<What should change, for whom, and why.>

## Contracts
- <Observable behavior or invariant.>

## Current state
- `<path or symbol>`: <fact that matters to the change.>

## Decisions
- <Decision and the reason it was chosen.>

## Open questions
- <Only unresolved questions that can change the design.>

## Implementation shape
<Likely seams and sequence, when they clarify the design.>

## Verification
- <Observable scenario that proves a contract holds.>
```

Omit empty sections. Use examples or a small table when they express a contract
more precisely than prose.

## Keep the signal high

- Preserve the user's words when they name a concept or distinction precisely.
- Separate observed facts, chosen decisions, and unresolved questions.
- Record evidence as pointers rather than copying large code excerpts.
- Describe implementation structure only far enough to preserve the design.
- Prefer a few connected findings over an exhaustive list of possible work.
- Omit scoring and process metadata such as confidence, uncertainty, effort,
  size, risk, status tables, commit stamps, and maintenance boilerplate unless
  the user specifically needs one of them for a decision.
- Omit exhaustive file allowlists, file denylists, per-step command transcripts,
  and instructions aimed at controlling a weaker executor.

The brief is complete when a fresh session can explain the intended outcome,
the contracts that define correctness, the decisions already settled, and the
remaining questions before it edits code.
