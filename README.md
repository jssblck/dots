# jess's dots

this is mostly for self reference; it's public so that i can access it on new system startup before authenticating github etc.
sharing in case anyone finds it useful.

branches are for different systems.
- macOS: `macos`; https://github.com/jssblck/dots/tree/macos
- Arch Linux: `arch`; https://github.com/jssblck/dots/tree/arch

This branch (`agents`) is my Windows user-level Claude Code and Codex config.

## Agent config backup policy

Only durable, hand-authored or portable agent config is tracked here.
Auth, sessions, logs, caches, sqlite, telemetry, and other machine state are
intentionally excluded (see `.gitignore`).

Tracked:

- `~/.claude/CLAUDE.md`
- `~/.claude/settings.json` (home path written as `__HOME__`)
- `~/.claude/statusline-command.ps1`
- `~/.claude/skills/` (`code-craft`, `impeccable`, `stop-slop`)
- `~/.codex/config.toml` (curated, see below)
- `~/.codex/AGENTS.md`
- `~/.agents/AGENTS.md` and `~/.agents/skills/` (shared cross-agent copies:
  `AGENTS.md` mirrors the Codex one; `impeccable` is the Codex-flavored
  superset, including its `agents/*.toml` + `openai.yaml` agent definitions,
  while `code-craft` and `stop-slop` match the `.claude/skills/` copies)

Not tracked:

- Claude / Codex auth (`~/.claude/.credentials.json`, `~/.codex/auth.json`)
- sessions, history, logs, sqlite, caches, shell snapshots, telemetry
- machine-local Claude permissions in `~/.claude/settings.local.json`
- Codex runtime state: marketplaces, mcp_servers, hook trust hashes,
  per-project trust paths, the `notify` hook path, runtime-bundled plugins

### Codex `config.toml` curation

The committed `config.toml` keeps durable preferences only. Dropped from the
live file because they are machine-local or leak private context:

- `notify` — absolute path to the machine's computer-use runtime binary
- `[marketplaces.*]` — local runtime cache paths
- `[projects.*]` trust entries — leak private project names and prompt-derived
  folder names; regenerated as you trust directories
- `[mcp_servers.*]` — machine-specific runtime paths, SHA pins, pipe names
- `[hooks.state.*]` — per-project trusted hashes
- runtime-bundled / primary-runtime `[plugins.*]` — their marketplaces are
  local caches; only the stable `@openai-curated` plugin enables are kept

## Restore

These files live under `~` on Windows. To restore, copy each tracked path back
into your home directory, then substitute the home placeholder in
`settings.json`:

```powershell
# from the repo root, on the `agents` branch
Copy-Item -Recurse -Force .claude $HOME\.claude
Copy-Item -Recurse -Force .codex  $HOME\.codex

# expand __HOME__ in the Claude statusline command
(Get-Content $HOME\.claude\settings.json) -replace '__HOME__', $HOME |
  Set-Content $HOME\.claude\settings.json
```

Auth is never stored here: sign in to Claude and Codex separately after
restoring.
