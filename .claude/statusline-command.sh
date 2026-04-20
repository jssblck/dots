#!/usr/bin/env bash
# Claude Code status line - mirrors Starship prompt style

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
model=$(echo "$input" | jq -r '.model.display_name // ""')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Shorten home directory to ~
home="$HOME"
short_cwd="${cwd/#$home/\~}"

# Git branch (skip optional locks to avoid contention)
branch=""
if git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git -C "$cwd" -c core.fsmonitor=false symbolic-ref --short HEAD 2>/dev/null \
    || git -C "$cwd" -c core.fsmonitor=false rev-parse --short HEAD 2>/dev/null)
fi

# Build output
parts=()
parts+=("$short_cwd")
[ -n "$branch" ] && parts+=("git $branch")
[ -n "$model" ] && parts+=("$model")
[ -n "$used_pct" ] && parts+=("ctx: $(printf '%.0f' "$used_pct")%")

printf '%s' "$(IFS=' | '; echo "${parts[*]}")"
