# programmatic-tool-calling: Future Plans

## Why this doc exists

This extension now provides:

- `bun_exec` and `python_exec`
- Artifact-first output (`returnMode: "artifact"` by default)
- Artifact readers (`ptc_artifact_read/head/tail`)
- Optional JSON parsing (`resultFormat: "json"`)
- Execution receipts (`ptc_receipt_read`)

This is strong "programmatic execution", but not full "programmatic tool calling" in the Anthropic sense.

## Research summary

### Anthropic vision (high level)

From Anthropic's Programmatic Tool Calling and Advanced Tool Use docs:

- Claude writes code that can invoke tools programmatically.
- Intermediate tool calls happen without full model round-trips for each call.
- Intermediate results stay out of model context; only final output is surfaced.
- This improves latency, token usage, and reliability for multi-step workflows.

### Current extension vs that vision

What we match well:

- Code-first orchestration for local tasks.
- Artifact-first response path to keep context compact.
- Structured result support (`resultFormat: "json"`).
- Reproducibility via hash-named code/output files and receipts.

Main gap:

- Code running in `bun_exec`/`python_exec` cannot directly call agent tools (`read`, `grep`, `find`, `ls`, etc.) as functions.
- There is no in-run tool bridge for programmatic tool calls from inside runtime code.

## Proposed feature: Tool Bridge Layer

## Goal

Allow code executed by `bun_exec`/`python_exec` to call an allowlisted subset of tools as injected functions, with strict guardrails.

Example target UX:

```ts
const files = await ptc.find({ path: ".", pattern: "*.ts" });
for (const f of files.items) {
  const src = await ptc.read({ path: f.path, limit: 400 });
  // parse/analyze in code
}
```

### Non-goals (MVP)

- No generic dynamic invocation of every registered tool.
- No write/edit/delete tool calls in MVP.
- No unrestricted shell execution via bridge.
- No long-lived daemon across sessions.

## MVP spec

### Scope

Add a read-only tool bridge for both Bun and Python execution paths.

Bridge-callable operations (v1):

- `read`
- `grep`
- `find`
- `ls`

Optional v1.1:

- `bash_readonly` with strict command allowlist (`pwd`, `ls`, `git status`, etc.)

### Security model

- Default deny.
- Explicit allowlist of bridge operations.
- Enforce per-call argument schema validation.
- Enforce cwd confinement (no path traversal outside allowed roots unless explicitly configured).
- Timeouts per call and per execution.
- Max call count per execution.
- Max bytes per response.
- Max aggregate bytes across all bridge responses per execution.

### Runtime architecture

1. Extension starts a short-lived local bridge server for one execution.
   - Transport: local HTTP JSON-RPC or newline-delimited JSON over stdio.
   - Recommended: HTTP on loopback with random token + random port.

2. Extension prepends runtime shim to user code.
   - Bun shim injects `globalThis.ptc`.
   - Python shim injects `ptc` module-like helpers.

3. Shim functions forward requests to bridge.

4. Bridge validates and dispatches to local adapters.

5. Adapters run corresponding operation and return normalized JSON.

6. Extension persists execution artifacts/receipt as today.

### API contract (bridge)

Request:

```json
{
  "id": "string",
  "op": "read|grep|find|ls",
  "args": { "...": "operation args" }
}
```

Response success:

```json
{
  "id": "string",
  "ok": true,
  "data": { "...": "normalized operation result" }
}
```

Response error:

```json
{
  "id": "string",
  "ok": false,
  "error": {
    "code": "VALIDATION|TIMEOUT|NOT_ALLOWED|INTERNAL",
    "message": "string"
  }
}
```

### Injected runtime API (MVP)

Bun:

```ts
await ptc.read({ path: "README.md", offset: 1, limit: 200 });
await ptc.find({ path: ".", pattern: "*.ts", limit: 200 });
await ptc.grep({ pattern: "TODO", path: ".", limit: 200 });
await ptc.ls({ path: "." });
```

Python:

```py
await ptc.read({"path": "README.md", "offset": 1, "limit": 200})
await ptc.find({"path": ".", "pattern": "*.ts", "limit": 200})
await ptc.grep({"pattern": "TODO", "path": ".", "limit": 200})
await ptc.ls({"path": "."})
```

Notes:

- All bridge functions are async.
- Return JSON-compatible objects only.
- No raw binary payloads.

### Adapter behavior

- Reuse existing tool semantics where practical (line limits, truncation style, details fields).
- Normalize outputs so runtime code can rely on stable shapes.
- Keep raw output available via artifact persistence when needed.

### Receipt additions (MVP)

Add optional fields:

- `bridgeEnabled: boolean`
- `bridgeOpsUsed: string[]`
- `bridgeCallCount: number`
- `bridgeBytesReturned: number`
- `bridgeErrors: number`

### Prompt guidance additions (MVP)

Append to system guidance when bridge is enabled:

- Prefer `ptc.*` bridge calls inside runtime code for repeated read/search/list workflows.
- Keep bridge usage bounded and summarize intermediate data before returning final output.

## Phased rollout plan

### Phase 0: Design and safety checks

- Finalize bridge transport choice.
- Define schemas and limits.
- Confirm cwd/path confinement behavior.

### Phase 1: Read-only bridge MVP

- Implement `read`, `grep`, `find`, `ls` bridge ops.
- Inject Bun and Python shims.
- Add bridge telemetry fields in receipts.
- Add tests for:
  - valid calls
  - schema failures
  - timeout handling
  - path confinement
  - byte/call budget enforcement

### Phase 2: UX improvements

- Better error messages with remediation hints.
- Add `ptc.bridge_help()` in shim.
- Optional compact summaries for large bridge responses.

### Phase 3: Optional write-capable bridge (separate gate)

- Add opt-in flag for mutable ops.
- Add explicit confirmations / guardrails.
- Add diff-aware audit trail in receipts.

## Open questions

- Should bridge adapters call internal shared operations directly or shell out to existing tools?
- Should bridge be enabled by default or behind a tool param (`bridge: true`)?
- Should we expose a max parallel bridge call setting?
- How strict should path confinement be for monorepo workflows?

## Success criteria

- Multi-file analysis tasks use fewer model tool turns.
- Lower context growth for iterative research/debug tasks.
- No regression in safety boundaries.
- Clear, auditable receipts for bridge usage.
