# code-craft

A user-level, language-agnostic coding skill with a per-language router. Load it
when writing, reviewing, or refactoring code in any supported language.

## What it is

`SKILL.md` holds eight durable engineering principles that hold in every
language, plus a router. The model applies the universal core, detects the
language in scope, and reads the matching dialect file.

```
code-craft/
  SKILL.md              universal core + language router (always loaded)
  principles/           language-agnostic depth, loaded on demand
    illegal-states.md       types encode invariants; names are not type safety; newtypes
    parse-dont-validate.md  boundary parsing into proof-carrying types
    errors-as-values.md     explicit errors, context chains, fail closed
    testing.md              behavior-first tests, no mocks, determinism
    architecture-docs.md    short stable architecture map
    simplicity.md           earn abstractions, profile before optimizing
    new-project-defaults.md formatters, linters, agent-rules layer, agentic review gate, CLI releases, community files
  languages/            per-language dialect, loaded for the language in scope
    rust.md
    typescript.md
    go.md
    python.md
```

## Provenance

Generalized from a set of repo-local Rust skills, themselves drawn from:

- `leonardomso/rust-skills` (MIT): 179 Rust rules across 14 categories.
- Matklad's Rust100k series: testing discipline, architecture docs, build
  performance.
- Alexis King: "Parse, don't validate" and "Names are not type safety."

The Rust-specific guidance was distilled into language-agnostic principles, and
the dialect of each principle was written out for Rust, TypeScript, Go, and
Python.

## Adding a language

Add `languages/<lang>.md` mapping the eight universal principles into that
dialect plus its unique idioms, and add a row to the router table in `SKILL.md`.
The principle files do not change per language.
