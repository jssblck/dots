---
name: wtp-workspaces
description: Use wtp as the default workspace manager. Covers non-obvious behavior for main-vs-workspace detection, original repo lookup, config format, target resolution, and cleanup workflows.
---

# wtp Workspaces (non-help notes)

Use this skill when asked to manage workspaces in repos that use `wtp`.

## Project convention

- Use `wtp` for workspace management unless explicitly asked to use raw `git worktree`.
- Treat the main worktree as the source of truth for shared local files (`.env*`, local tool config, etc.).

## Non-obvious behavior

- `wtp cd` (same as `wtp cd @`) prints the main worktree absolute path, even when run inside another workspace.
- Normal `wtp` operations (`add`, `list`, `remove`, `cd`, `exec`) read config from `<main-worktree>/.wtp.yml`.
  - Important: `wtp init` writes `.wtp.yml` in your current directory. If you run it in a subdirectory or a linked workspace, that config is usually ignored by normal wtp flows.
- Target resolution for `wtp remove` and `wtp exec` is broader than the help text:
  1. exact branch name
  2. managed worktree name (relative to `defaults.base_dir`)
  3. directory basename
  4. main aliases for navigation/exec: `@`, `root`, repo directory name
- `wtp remove` only removes `managed` worktrees (under configured `base_dir`). Worktrees created elsewhere show as `unmanaged` and must be removed with `git worktree remove`.
- Command hooks receive these env vars:
  - `GIT_WTP_REPO_ROOT` (main worktree root)
  - `GIT_WTP_WORKTREE_PATH` (new worktree root)
- Copy hooks do not support glob patterns. `from` is a single file or directory path.

## Determine where you are

```bash
main_root="$(cd "$(wtp cd)" && pwd -P)"
here_root="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"

if [ "$here_root" = "$main_root" ]; then
  echo "in main worktree"
else
  echo "in linked workspace"
fi
```

## Reference paths you usually need

```bash
main_root="$(wtp cd)"
workspace_root="$(git rev-parse --show-toplevel)"
branch="$(git branch --show-current)"
```

Inside hooks, prefer `GIT_WTP_REPO_ROOT` and `GIT_WTP_WORKTREE_PATH`.

## Git workflow once inside a workspace (merge main + open PR)

```bash
# from workspace
branch="$(git branch --show-current)"

# update main worktree without leaving current workspace
wtp exec @ -- git fetch origin --prune
wtp exec @ -- git pull --ff-only origin main

# bring latest main into current workspace branch
git fetch origin --prune
git merge origin/main

# push and open PR
git push -u origin "$branch"
gh pr create --base main --head "$branch" --fill
```

If the default branch is not `main`, detect it first with:
`git symbolic-ref --short refs/remotes/origin/HEAD`

## `.wtp.yml` format (actual schema)

```yaml
version: "1.0"
defaults:
  base_dir: ../worktrees

hooks:
  post_create:
    - type: copy
      from: .env
      to: .env      # optional when from is relative (defaults to from)

    - type: symlink
      from: .bin
      to: .bin

    - type: command
      command: npm ci
      env:
        NODE_ENV: development
      work_dir: .
```

Validation rules that are easy to miss:
- `copy`: `from` required; absolute `from` requires explicit `to`.
- `command`: `command` required; `from` and `to` are invalid.
- `symlink`: both `from` and `to` required.

Path semantics:
- `copy.from` and `symlink.from` relative paths resolve from the main worktree.
- `copy.to` and `symlink.to` relative paths resolve in the new worktree.
- `command` runs in the new worktree by default (`work_dir` overrides this).

## Task playbooks

### "copy all .env files from the main repo"

Use a one-off shell copy from main root to current workspace root:

```bash
main_root="$(wtp cd)"
workspace_root="$(git rev-parse --show-toplevel)"

find "$main_root" -maxdepth 1 -type f -name '.env*' -print0 |
  while IFS= read -r -d '' src; do
    cp "$src" "$workspace_root/$(basename "$src")"
  done
```

### "configure to always copy .env files from the main repo"

Because copy hooks do not support globs, use a `command` hook in `<main-root>/.wtp.yml`:

```yaml
version: "1.0"
defaults:
  base_dir: ../worktrees
hooks:
  post_create:
    - type: command
      command: |
        set -eu
        find "$GIT_WTP_REPO_ROOT" -maxdepth 1 -type f -name '.env*' -print0 |
          while IFS= read -r -d '' src; do
            cp "$src" "$GIT_WTP_WORKTREE_PATH/$(basename "$src")"
          done
```

### "remove <branch>"

1. Confirm the branch exists in `wtp list` and is `managed`.
2. If currently inside that workspace, switch first: `wtp cd @`.
3. Remove by branch name: `wtp remove "<branch>"`.

If the entry is `unmanaged`, use `git worktree remove <path>` instead.

### "clean up workspaces"

Suggested logic:
1. `cd "$(wtp cd)"` and `git fetch origin --prune`.
2. Enumerate worktrees and branch names (use `git worktree list --porcelain` for script-safe parsing).
3. For each non-main managed branch:
   - Check merged PR existence:
     `gh pr list --state merged --head "<branch>" --limit 1 --json number`
   - Skip dirty worktrees unless force was requested.
   - Remove with branch cleanup:
     `wtp remove --with-branch "<branch>"`
4. Skip `unmanaged` entries or clean them with raw git separately.

## Provenance

These notes are distilled from:
- `wtp` v2.8.0 runtime behavior
- `README.md` in `satococoa/wtp`
- source files:
  - `cmd/wtp/worktree_resolver.go`
  - `cmd/wtp/remove.go`
  - `cmd/wtp/worktree_managed.go`
  - `internal/config/config.go`
  - `internal/hooks/executor.go`
