# Working in this repo

This repository backs up my user-level agent config (Claude Code and Codex). It
is kept in sync by an agent routine that runs both directions: home to repo
(backup) and repo to home (restore).

**Before you back up or restore anything here, read [SYNC.md](SYNC.md).** It is
the source of truth for:

- the directory mapping (`dotagents/` <-> `~/.agents/` and each
  product-specific config directory)
- the allowlist of what is backed up (skills, `CLAUDE.md` / `AGENTS.md`,
  `settings.json`, `config.toml`)
- the sanitization rules (the `settings.json` `__HOME__` placeholder, the
  curated Codex `config.toml`)
- the restore direction, including the `config.toml` merge that must not clobber
  live machine-specific sections

Never commit auth, sessions, logs, sqlite, or other machine state. The
`.gitignore` is a safety net, but the allowlist in SYNC.md is the primary
control.

Note: this file is guidance for agents operating on the repo. It is not
backed-up config. The backed-up instruction files live at
`dotclaude/CLAUDE.md` and `dotagents/AGENTS.md`.
