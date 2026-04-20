# AGENTS.md

Global instructions for all pi sessions.

## Engineering defaults (required)

- Do not prioritize backwards compatibility unless the user explicitly asks for it.
- Do not assume existing issues are acceptable; fix them when found (boy scout rule).

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
