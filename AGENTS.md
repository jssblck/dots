# AGENTS.md

Instructions for agents working in this dotfiles repo.

## Purpose

This repo is the public, portable snapshot of Jess's macOS dotfiles and durable agent configuration. It should contain hand-authored config, scripts, prompts, and extensions, not machine-local runtime state.

## Update the repo from local user state

Use this when the local machine has the desired current config and the repo should be refreshed from it.

1. Work from the repo root:

   ```sh
   cd /Users/jess/dots
   ```

2. Run the backup script:

   ```sh
   ./sync_backup
   ```

   The script copies the configured files from `$HOME` into this repo. It also applies the repo's portability rules, such as replacing `$HOME` with `__HOME__` in portable config files, writing `.pi/web-tools.json.example` instead of the real secret file, and excluding Pi extension `node_modules/`, `disabled/`, and `workspace/` directories.

3. Review the result carefully:

   ```sh
   git status --short --untracked-files=all
   git diff --stat
   git diff --check
   ```

4. Make sure you're not saving any secrets. Before committing, audit the changed and untracked files for:

   - API keys, tokens, passwords, private keys, JWTs, auth headers, and URL embedded credentials.
   - Machine-local files such as `~/.pi/web-tools.json`, `~/.pi/agent/auth.json`, session history, logs, caches, telemetry, messenger or mesh config, and Claude `settings.local.json`.
   - Accidental copies of generated dependency directories such as `node_modules/`.

   If a likely secret or local runtime artifact appears in `git status`, `git diff`, or an untracked file, stop and remove it before committing. Prefer placeholders such as `__PI_EXA_API_KEY__` for examples.

5. Commit only the intended durable config changes.

## Apply the repo to local user state

Use this when the repo has the desired config and the local machine should be updated from it.

1. Work from the repo root:

   ```sh
   cd /Users/jess/dots
   ```

2. Run the restore script:

   ```sh
   ./sync_restore
   ```

   The script first saves the current local state to `.backup/<timestamp>/`, then copies the repo snapshot into `$HOME`. Portable files are rendered by replacing `__HOME__` with the current `$HOME`.

3. Secret restore behavior:

   - `~/.pi/web-tools.json` is not stored in the repo.
   - If `PI_EXA_API_KEY` is set, `sync_restore` writes `~/.pi/web-tools.json` from that environment variable.
   - If `PI_EXA_API_KEY` is unset and a local `~/.pi/web-tools.json` already exists, the script leaves it alone.
   - If neither is true, the script skips that file.

4. After restore, the script reinstalls Pi extension dependencies in `~/.pi/agent/extensions` using npm with scripts disabled.

## Change discipline

- Touch only files needed for the requested dotfiles update.
- Keep the repo portable and public-safe.
- Do not commit secrets or local runtime state.
- Review diffs before committing or pushing.
