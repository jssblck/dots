# Portability gotchas

The traps that make this pattern subtly wrong if you don't know them. Each has a
one-line fix already baked into the templates; this file is the why.

## 1. `curl … | grep -m1` aborts the script (SIGPIPE)

In `cloud-setup.sh`, fetching a "latest release" tag with
`curl … | grep -m1 '"tag_name"'` is a race under `set -euo pipefail`: `grep`
exits on the first match and closes the pipe while `curl` is still writing the
(large) JSON body, so `curl` dies on **SIGPIPE with exit 23** ("Failure writing
output to destination"). `pipefail` propagates that and `set -e` turns it into a
fatal abort — intermittently, which is the worst kind.

**Fix:** buffer the body into a variable first, then `grep` it.

```bash
meta="$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest)"
ver="$(printf '%s' "$meta" | grep -m1 '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/')"
```

## 2. Anchor file paths on `import.meta.url`, not `process.cwd()`

`SessionStart` hooks normally run with the working directory at the repo root,
but the platform doesn't strictly guarantee it. If `bootstrap.mjs` resolved
paths from `process.cwd()`, a non-root cwd would make it read/write the wrong
files.

**Fix:** derive the repo root from the file's own location.

```js
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
```

## 3. The hook command must be relative

`bootstrap.mjs` runs on macOS, Linux, and Windows. An absolute
`"$CLAUDE_PROJECT_DIR"/.claude/bootstrap.mjs` expands under `sh` but **not**
PowerShell (`$VAR` vs `%VAR%`), so the hook breaks on Windows.

**Fix:** keep the hook command relative — `node .claude/bootstrap.mjs` — and let
`bootstrap.mjs` re-anchor on `import.meta.url` (gotcha 2). The relative command
resolves the same way under every shell.

## 4. Cloud `node` is on PATH, not nvm-managed

In the cloud image, `node` lives at `/opt/node22/bin` and is on the image PATH
— it is **not** nvm-managed. So the relative `node …` hook command resolves
without sourcing any shell init. Don't add an `nvm use` or a shell-profile
dependency to make the hook find Node.

## 5. The cloud setup script re-runs — keep it idempotent

`cloud-setup.sh` is not a once-per-machine installer. It re-runs on any fresh
session: whenever you change the script or the network allowlist, and
periodically. Every install must be guarded so a re-run is a fast no-op.

**Fix:** `command -v <tool> >/dev/null 2>&1` guard around each install, and make
the already-installed branch just log and skip.

## 6. The env-vars UI field is shared and visible

The cloud environment's "Environment variables" field is visible to everyone who
can use the environment. It is not a secret store. Non-secret defaults belong in
`bootstrap.mjs` (versioned); real secrets belong in neither the field nor the
repo. See [`environment.md`](environment.md).
