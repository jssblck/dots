# jess's dots

this is mostly for self reference; it's public so that i can access it on new system startup before authenticating github etc.
sharing in case anyone finds it useful.

branches are for different systems.
- macOS: `macos`; https://github.com/jssblck/dots/tree/macos
- Arch Linux: `arch`; https://github.com/jssblck/dots/tree/arch

This branch (`agents`) backs up my Windows user-level agent config (Claude Code,
Codex, and shared cross-agent files). It is kept in sync by an agent routine
that runs both directions: home to repo (backup) and repo to home (restore).

## Layout

Each top-level directory mirrors a home agent directory:

| Repo dir     | Home dir     | Tool               |
| ------------ | ------------ | ------------------ |
| `dotclaude/` | `~/.claude/` | Claude Code        |
| `dotcodex/`  | `~/.codex/`  | Codex              |
| `dotagents/` | `~/.agents/` | Shared cross-agent |

## Backup / restore policy

See [SYNC.md](SYNC.md). It is the source of truth for what gets backed up, how
files are sanitized (the Claude `__HOME__` placeholder, the curated Codex
`config.toml`), and how restore reverses each step. Auth is never stored here:
sign in to Claude and Codex separately after restoring.

For [Claude Code on the web](https://claude.ai/code), a fresh cloud session
clones only the target repo and never runs that routine, so `claude-cloud-restore.sh`
lays the Claude config (skills, `CLAUDE.md`, sanitized `settings.json`) into
`~/.claude/` instead. Wire it into the cloud environment's Setup script:

```bash
d=$(mktemp -d); git clone --depth 1 --branch agents https://github.com/jssblck/dots "$d" && bash "$d/claude-cloud-restore.sh"
```

See [SYNC.md](SYNC.md#cloud-restore-claude-code-on-the-web) for what the cloud
restore keeps and drops.
