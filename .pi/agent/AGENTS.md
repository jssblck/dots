# AGENTS.md

Global instructions for all pi sessions.

## Engineering defaults (required)

- Do not prioritize backwards compatibility unless the user explicitly asks for it.
- Do not assume existing issues are acceptable. Fix issues when they are in scope or block the requested work; mention unrelated issues rather than changing them without permission.

## Capability calibration (required)

- Do not perform incapability theater. Do not pretend a task is too large, too complex, or too ambitious when it is feasible with available tools, tests, and iteration.
- Calibrate to 2026-era coding-agent capability: when the codebase is understandable and feedback loops are available, producing 1000-3000 LOC/hour including tests and docs is realistic.
- Use that capability to make better tradeoffs. More tasks are worth scoping in when they directly serve the user's goal, especially tests, docs, migrations, cleanup caused by the change, and end-to-end verification.
- This does not override simplicity or surgical-change rules. Expand scope only when it improves the requested outcome; do not add speculative features, abstractions, or unrelated refactors.
- Be honest about uncertainty and limitations, but do not use generic caution as a substitute for trying, measuring, and iterating.

## Karpathy-inspired coding discipline (required)

Adapted from `forrestchang/andrej-karpathy-skills`. These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think before coding

- Do not assume or hide confusion. State ambiguity explicitly.
- Present multiple interpretations rather than silently picking one.
- Push back when a simpler approach exists or the request seems misdirected.
- Stop and ask rather than guessing when uncertainty affects the outcome.

### 2. Simplicity first

- Implement the minimum complete solution that solves the problem, including necessary tests, docs, migrations, and verification.
- Do not add features, abstractions, configurability, or flexibility that was not requested.
- Do not add error handling for impossible scenarios.
- If the solution feels overcomplicated, simplify before proceeding.

### 3. Surgical changes

- Touch only what the request requires.
- Do not "improve" adjacent code, comments, formatting, or APIs unless needed for the task.
- Do not refactor code that is not broken.
- Match the existing style even if you would choose differently.
- Clean up imports, variables, functions, and files made unused by your own changes.
- Mention unrelated dead code or issues instead of changing them unless the user asks or they block the task.
- Every changed line should trace directly to the user's request.

### 4. Goal-driven execution

- Turn requests into explicit success criteria and verification steps.
- For bug fixes, reproduce the bug with a test or minimal failing command first when practical, then make it pass.
- For validation or behavior changes, cover invalid and expected inputs when practical.
- For refactors, verify behavior before and after.
- For non-trivial multi-step tasks, state a brief plan with how each step will be checked.
- Loop until the defined checks pass, or report the blocking uncertainty.

## Command workflows (required)

- For multi-step inspections or changes, prefer a single small Bun script over several back-to-back shell commands.
- Use `bun -e '...'` with a multiline script when the task needs shared state, parsing, iteration, branching, or coordinated updates.
- Prefer plain shell commands only for simple one-step operations.

## Quote style (required)

Never use smart/curly quotes in chats, tool outputs, or file edits.
Always use plain ASCII quotes:

- Double quote: `"`
- Single quote: `'`

Examples (left = disallowed, right = required):

- `\u201Chello\u201D` -> `"hello"`
- `\u2018hello\u2019` -> `'hello'`
- `It\u2019s` -> `It's`
- `Don\u2019t` -> `Don't`
- `\u00ABquoted\u00BB` -> `"quoted"`
- ``printf(\u201Chi\u201D)`` -> ``printf("hi")``
- `title: \u201CTest\u201D` -> `title: "Test"`

If text already contains smart quotes, normalize them to ASCII quotes unless the user explicitly asks to preserve typography.
