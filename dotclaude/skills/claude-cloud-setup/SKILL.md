---
name: claude-cloud-setup
description: Use when setting up a repository to run in Claude Code on the web (cloud sessions) with zero per-machine manual setup, and to bootstrap local dev from the same files. Installs the three-file `.claude/` pattern — a cloud-only toolchain install script (`cloud-setup.sh`), a cross-platform per-session SessionStart hook (`bootstrap.mjs`), and the `settings.json` that wires it — and configures the web-UI cloud environment (network allowlist, setup script, secrets policy). Covers probing the base image for genuinely missing tools, idempotent installs, self-gating per-session steps (env vars, services, deps), and the deliberate bash/Node split. Invoke with /claude-cloud-setup.
user-invocable: true
argument-hint: "[repo-path]"
license: MIT
metadata:
  version: "1.0.0"
  sources:
    - attunehq/infra .claude pattern (the worked example this generalizes)
---

# Claude cloud setup

Make a repo run in [Claude Code on the web](https://claude.ai/code) with **zero
per-machine manual setup**, and bootstrap local dev (macOS / Linux / Windows)
from the same files. The setup is versioned in the target repo, so every
session — cloud or local, anyone on the team — starts from the same known-good
state.

The whole thing is three small files in the repo plus a thin cloud
"environment" object in the web UI. This skill drives writing those files for a
specific repo, correctly.

## When to use this

- "Set this repo up for Claude Code on the web / cloud sessions."
- "Add a SessionStart hook that installs our toolchain and brings up services."
- "Make a fresh cloud session of this repo Just Work without a manual install dance."

Not for: configuring the host machine's own Claude install (that's dotfiles), or
one-off shell commands that don't belong in a versioned bootstrap.

## The pattern: three files + a thin cloud shell

| File | Runtime | Runs | Where | Job |
|------|---------|------|-------|-----|
| `.claude/cloud-setup.sh` | bash | before a cloud session starts | **cloud only**, Ubuntu/root | install toolchain the base image lacks |
| `.claude/bootstrap.mjs` | node | every session start & resume | **local + cloud**, all 3 OSes | cheap per-session prep (env vars, services, deps) |
| `.claude/settings.json` | — | — | repo config | wire `bootstrap.mjs` as a `SessionStart` hook |

Two deliberate choices — keep both:

- **The cloud half is bash; the per-session half is Node.** The cloud setup
  script runs as root on Ubuntu, so bash + `apt` is natural. The per-session
  half must run on macOS, Linux, *and* Windows, so it's Node — Claude Code
  itself runs on Node, so `node` is guaranteed present everywhere with no extra
  toolchain and no build step. Keep `bootstrap.mjs` to Node + standard library
  only.
- **The hook command is relative** (`node .claude/bootstrap.mjs`). An absolute
  `"$CLAUDE_PROJECT_DIR"/...` form expands under `sh` but not PowerShell, so a
  relative command avoids the `$VAR` / `%VAR%` shell split across OSes.
  `bootstrap.mjs` then re-anchors on its own location (`import.meta.url`) so its
  file operations are correct even if the hook's working directory isn't the
  repo root.

The cloud environment object stays a **thin shell**: network level, (non-secret)
environment variables, and a one-line guarded Setup script. All real logic lives
in the three files, so it's versioned and reviewable.

## Recipe

Work the steps in order. Don't skip step 1 — the files must reflect what the
target repo actually is, not a template's guesses.

### Step 1 — Learn the repo first

Inspect; don't assume. Determine:

- the stack and how local services run (is there a `docker-compose.yml` /
  `compose.yaml`? which services and ports? a database?);
- the **real**, non-secret dev environment variables the app needs and their
  dev values;
- the Node version, if the project pins one;
- the lint / format / test commands and the repo's branch + commit conventions.

Everything below reflects what you find. **If the repo has no compose file or no
database, drop those steps — don't invent them.**

### Step 2 — Probe a cloud session for genuinely missing tools

The cloud base image (Ubuntu 24.04, default **Trusted** network) already ships:
rust, node 20/21/22, python + uv, go, ruby, a JVM, docker + compose, the
postgres 16 client, redis 7, and the standard language package registries.
**Don't reinstall those.** Find the real gaps by running this in a cloud session
before adding anything:

```bash
for t in rustc cargo node python3 uv go ruby docker psql redis-server java gh kubectl terraform flux aws; do
  printf '%-14s ' "$t"; command -v "$t" >/dev/null && "$t" --version 2>&1 | head -1 || echo MISSING
done
```

`gh` is the most common gap. Install a tool only if the repo's dev loop actually
uses it.

### Step 3 — Write `.claude/cloud-setup.sh`

Start from [`references/cloud-setup.sh`](references/cloud-setup.sh). Bash,
Ubuntu/root, **idempotent**: guard each install with `command -v <tool>` so a
re-run is a fast skip (the script re-runs on any fresh session — whenever you
change it or the network allowlist, and periodically). Install only what step 2
showed missing *and* the repo needs. The template ships `gh` as the worked
example and a commented stub for adding more.

Prefer download hosts already on the **Trusted** allowlist (GitHub release
assets, the HashiCorp apt repo, `dl.k8s.io`, the standard language registries).
If you need a host that isn't, the environment's Network access must widen to
**Custom** with that host added (step 6).

Watch the one bash gotcha when fetching a "latest release" tag: under
`set -euo pipefail`, `curl ... | grep -m1` makes `curl` die with SIGPIPE
(exit 23) when `grep` closes the pipe early, aborting the script. Buffer the body
into a variable first, then `grep` it. The template does this; see
[`references/gotchas.md`](references/gotchas.md).

### Step 4 — Write `.claude/bootstrap.mjs`

Use [`references/bootstrap.mjs`](references/bootstrap.mjs) as-is — it's
repo-agnostic. Node + standard library only. Each step **self-gates**, so the one
file is correct both locally and in the cloud (no blanket "cloud only" guard):

- **Env vars (cloud only):** if `process.env.CLAUDE_CODE_REMOTE === "true"` and
  `$CLAUDE_ENV_FILE` is set, append `export KEY=value` lines to that file. Put
  only **non-secret** defaults here (region, feature flags). Real secrets never
  go in a versioned file or the env-vars UI field.
- **Services (only if a compose file exists):** detect `docker-compose.yml` /
  `compose.yaml` and `docker compose up -d --wait`; otherwise skip.
- **Dependencies (only for managers the repo uses):** detect `package.json` /
  `Cargo.toml` / `go.mod` / `requirements.txt` / `Gemfile` and run the matching
  install; otherwise skip.

Fill in the real env vars from step 1. Keep paths anchored on `import.meta.url`,
not `process.cwd()`. Let steps log and continue on error so a hiccup never
blocks a session.

### Step 5 — Write (or merge) `.claude/settings.json`

Register the hook with a **relative** command using
[`references/settings.json`](references/settings.json). If the file already
exists, **merge** — don't clobber other settings:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          { "type": "command", "command": "node .claude/bootstrap.mjs" }
        ]
      }
    ]
  }
}
```

### Step 6 — Configure the cloud environment (web UI)

Open the environment dialog (cloud icon → add/edit environment) and set the
fields per [`references/environment.md`](references/environment.md). In short:

| Field | Value |
|-------|-------|
| **Name** | anything (e.g. `Default`) |
| **Network access** | **Trusted** to start; widen to **Custom** only for hosts you proved you need |
| **Environment variables** | leave empty unless you have non-secret values — this field is visible to everyone using the environment, so **never put secrets here** |
| **Setup script** | `if [ -f .claude/cloud-setup.sh ]; then bash .claude/cloud-setup.sh; fi` |

The guarded Setup-script line lets one environment serve repos that *don't* ship
a `cloud-setup.sh` (clean skip, session still starts) while still surfacing real
install failures where the file exists.

### Step 7 — Verify, then open a PR

- Run `bash .claude/cloud-setup.sh` twice; the second run should skip everything.
- Run `node .claude/bootstrap.mjs` and confirm it's clean; in a cloud session
  confirm the env file gets the variables.
- Run the repo's lint/format/test and get it green.
- Commit on a branch following the repo's conventions and open a PR.

## References

Load on demand:

- [`references/cloud-setup.sh`](references/cloud-setup.sh) — idempotent toolchain-install template (gh worked example + stub).
- [`references/bootstrap.mjs`](references/bootstrap.mjs) — cross-platform per-session hook (env / compose / deps, self-gating).
- [`references/settings.json`](references/settings.json) — the hook-wiring template.
- [`references/environment.md`](references/environment.md) — web-UI cloud environment config: network levels, setup script, secrets.
- [`references/gotchas.md`](references/gotchas.md) — the portability traps (curl|grep SIGPIPE, `import.meta.url`, relative hook command, cloud node path, idempotency).

## Precedence

The target repo's instructions and conventions win. If its `AGENTS.md` /
`CLAUDE.md` or established patterns conflict with anything here, follow the repo
and say so. This skill is the default scaffold, not an override.
