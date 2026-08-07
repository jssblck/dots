# TypeScript / JavaScript dialect

How the universal core is spelled in TypeScript, plus TS/JS-specific idioms. The
overriding rule: let the type system do work, and keep `any` out.

## Tooling baseline

Default to Biome (Rust-based, one tool for format + lint + import sorting), not
Prettier + ESLint:

```sh
biome check .         # format + lint + organize-imports in one pass
                      # biome check --write  applies fixes; biome ci  runs in CI
tsc --noEmit          # type-check (Biome does not type-check; CI must run this)
```

One config, `biome.json`, committed to the repo. Do not also run Prettier or
ESLint. Biome's type-aware lint rules are arriving, but `tsc --noEmit` is still
the type-check of record. See
[`../principles/new-project-defaults.md`](../principles/new-project-defaults.md).

### Ban the type-system escape hatches (default)

Turn `any` into an error, and while you are there ban the other ways code lies to
the checker. This is the default for new TS projects:

```jsonc
// biome.json
{
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error" },
      "style": { "noNonNullAssertion": "error", "useConst": "error" }
    }
  },
  "plugins": ["./node_modules/biome-plugin-no-type-assertion/no-type-assertion.grit"]
}
```

`noExplicitAny` bans `any` (use `unknown` + narrowing), `noNonNullAssertion` bans
`!` (handle the null), and the `biome-plugin-no-type-assertion` GritQL plugin
bans `as` casts (parse, do not assert). Together they stop the three standard
ways of disabling the type system locally.

`tsconfig.json` non-negotiables:

```jsonc
{
  "compilerOptions": {
    "strict": true,                     // the whole strict family
    "noUncheckedIndexedAccess": true,   // arr[i] is T | undefined; huge bug catcher
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

`strict: true` is the floor, not the ceiling. `noUncheckedIndexedAccess` in
particular turns a whole class of "undefined is not a function" runtime crashes
into compile errors.

## Illegal states (core 1, 4)

- **Discriminated unions for state.** This is the single most valuable TS
  pattern. Replace boolean/optional soup with a tagged union and `switch` on the
  tag:
  ```ts
  type State<T> =
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: T };
  ```
  The `ready` branch is the only place `data` exists, so you cannot read it while
  loading. Use a `never`-returning `assertNever(x)` in the `default` case to get
  exhaustiveness checking: adding a variant becomes a compile error everywhere
  it is unhandled.
- **Branded (nominal) types** for newtypes, since TS is structural:
  ```ts
  type UserId = string & { readonly __brand: "UserId" };
  const UserId = (raw: string): UserId => { /* validate */ return raw as UserId; };
  ```
  Now a bare `string` will not pass where `UserId` is required. Brand IDs, units,
  and validated values.
- `unknown`, never `any`. `any` disables the type checker locally and infectiously.
  Take `unknown` at boundaries and narrow it. If you must escape, `as` with a
  comment and a runtime check, not `any`.
- `readonly` and `as const` for immutability; `satisfies` to check a literal
  against a type without widening it.
- Prefer unions of string literals over `enum` (enums have surprising runtime
  and nominal behavior); reach for `enum` only when you need its specific
  features.

## Parse, don't validate (core 2)

- **Schema-parse external data at the boundary** with zod, valibot, or arktype.
  The schema is the parser and the type source:
  ```ts
  const Config = z.object({ port: z.number().int().positive(), host: z.string() });
  type Config = z.infer<typeof Config>;
  const config = Config.parse(rawJson);   // throws on bad shape; config is typed
  ```
  Do not hand-write `isValidConfig(x): boolean` and keep passing the raw object.
  Parse once, pass `Config` inward.
- This matters more in TS than anywhere else: `JSON.parse` returns `any`, network
  responses are lies, `process.env` values are `string | undefined`. Every one of
  those is a boundary that must be parsed, not trusted.
- `z.infer` so the static type and the runtime check cannot drift.

## Errors (core 3)

- **Throw for exceptional, return for expected.** Two viable styles; be
  consistent within a module:
  - Idiomatic TS: `throw` a typed `Error` subclass, `catch` at a known seam.
    Always extend `Error` (never `throw "string"`), set `cause` to chain:
    `throw new ConfigError("loading profile", { cause: err })`.
  - Result style: return a `{ ok: true; value } | { ok: false; error }` union (or
    neverthrow's `Result`) when you want the error in the signature and
    exhaustive handling. Good for expected, branchy failure.
- **Never swallow:** no empty `catch {}`, no unhandled promise. A floating
  promise drops its rejection; `await` it or `.catch` it explicitly. Enable the
  `no-floating-promises` lint.
- **Fail closed** in gates: a guard that throws or times out denies.
- Async errors: `async`/`await` with `try/catch`, not raw `.then` chains. Use
  `Promise.all` for parallel, `Promise.allSettled` when you need every result
  regardless of individual failures.

## Naming and style

`camelCase` values/functions, `PascalCase` types/classes/components,
`UPPER_SNAKE` consts. Booleans `is`/`has`/`can`. No Hungarian, no `I` prefix on
interfaces. Files: match the project (kebab-case is common). Prefer named exports
over default exports (better refactor/autocomplete).

## Async (TS-specific)

- `async`/`await` throughout; never mix with bare callbacks.
- `Promise.all([...])` for independent parallel work, not sequential awaits in a
  loop when the iterations are independent. `Promise.allSettled` to collect all
  outcomes. `AbortController` / `AbortSignal` for cancellation and timeouts.
- Beware the sequential-await-in-a-loop performance trap; batch with
  `Promise.all` when order-independent.

## Functional and immutability

Prefer `map`/`filter`/`reduce` and immutable updates over in-place mutation where
it reads clearly. `const` by default. Do not mutate function arguments. Keep
side effects at the edges so the core is testable.

## Project structure

Organize by feature/domain, not by technical layer (`user/` not
`controllers/ models/ views/` split across the app). Barrel files (`index.ts`)
sparingly: they help the public surface but can create import cycles and slow
tooling. Keep the public API of a module explicit.

## Testing (core 6)

- Vitest or Jest; `tsc --noEmit` is part of the test gate (a green test suite
  with type errors is not green).
- Test behavior through the module's public surface. Avoid `jest.mock` of
  internal modules and `vi.spyOn` on your own functions; that pins
  implementation. Use real implementations, a real in-memory store, MSW for HTTP
  boundaries, real temp dirs.
- `fast-check` for property-based tests. Deterministic: fake timers
  (`vi.useFakeTimers`) instead of real `setTimeout` waits; inject the clock and
  RNG.
- Descriptive `describe`/`it` names that read as behavior sentences.

## Anti-patterns to refuse

`any` (use `unknown` + narrowing); non-null `!` to silence the checker instead of
handling the null; `as` casts that lie about runtime shape; `enum` by reflex;
floating promises; empty `catch`; `JSON.parse` result used untyped; boolean-flag
soup instead of a discriminated union; default exports everywhere; mocking your
own modules; `==` (use `===`). The Biome config above makes the `any` / `!` /
`as` ones hard errors rather than review nits.
