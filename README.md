# jess's dots

This repo is public so I can bootstrap a new machine before signing into everything else.
This branch is my macOS setup.

## Core tools

- kitty
- zsh
- eza
- fzf
- bat
- zoxide
- tokei
- jaq
- btm
- volta
- procs

## Agent config backup policy

Only durable, hand-authored agent config is tracked here.
Sessions, logs, caches, auth, telemetry, and other machine state are intentionally excluded.

Tracked config includes:

- `~/.pi/agent/AGENTS.md`
- `~/.pi/agent/settings.json`
- `~/.pi/agent/agents/`
- `~/.pi/agent/prompts/`
- `~/.pi/agent/extensions/` (without `node_modules/`, `disabled/`, or `workspace/`)
- `~/.pi/bin/npm-no-scripts`
- `~/.agents/skills/`
- `~/.claude/CLAUDE.md`
- `~/.claude/settings.json`
- `~/.claude/statusline-command.sh`
- `~/.claude/plugins/blocklist.json`
- `~/.claude/skills/`
- `~/.codex/config.toml`
- `~/.codex/rules/default.rules`

Not tracked:

- Pi / Claude / Codex auth
- sessions and history
- caches, sqlite files, shell snapshots, telemetry
- Pi messenger / mesh / companion config that I do not use
- machine-local Claude permissions in `~/.claude/settings.local.json`

## Secrets

`~/.pi/web-tools.json` is not committed.
The repo stores `~/.pi/web-tools.json.example` with a placeholder instead.
To restore it, set:

```sh
export PI_EXA_API_KEY=...
```

Then run `./sync_restore`.
If the variable is unset, restore leaves an existing local `~/.pi/web-tools.json` alone.

## Backup / restore

`./sync_backup`
- copies the current machine state into the repo
- sanitizes public files where needed

`./sync_restore`
- saves the current local state to `.backup/<timestamp>/`
- restores the tracked repo state into `~`
- reinstalls `~/.pi/agent/extensions` dependencies with `npm --ignore-scripts`
