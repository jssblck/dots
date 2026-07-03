#!/usr/bin/env bash
#
# claude-cloud-restore.sh: lay this branch's Claude Code user-level config into a
# Claude Code on the web (cloud) session.
#
# WHAT THIS IS
#   A cloud-only, additive RESTORE that runs before a web session starts. Cloud
#   sessions boot a fresh, ephemeral container that clones only the target
#   repository, so none of the user-level `~/.claude/` config tracked on this
#   branch is present. This script clones-in nothing itself; it is meant to be
#   run from a checkout of this branch and copies the tracked config into the
#   session's home directory:
#
#     dotclaude/skills/*  -> ~/.claude/skills/   (additive; user skills)
#     dotclaude/CLAUDE.md -> ~/.claude/CLAUDE.md  (user memory)
#     dotclaude/settings.json -> ~/.claude/settings.json (sanitized cloud profile, merged)
#
#   Claude Code config only: ~/.agents and ~/.codex are intentionally NOT
#   restored here. This is the Claude Code cloud (claude.ai/code), so Codex and
#   the shared cross-agent files have no consumer in the session.
#
#   Wire it into the cloud environment's "Setup script" field (web UI) with a
#   one-liner that clones this public branch and runs this file:
#
#     d=$(mktemp -d); git clone --depth 1 --branch agents https://github.com/jssblck/dots "$d" && bash "$d/claude-cloud-restore.sh"
#
#   Pair it with the per-repo toolchain half if the target repo ships one:
#
#     [ -f .claude/cloud-setup.sh ] && bash .claude/cloud-setup.sh
#
# DIFFERENCES FROM THE SYNC.md RESTORE
#   The SYNC.md restore is a full, bidirectional MIRROR onto a trusted personal
#   machine: it deletes home skills the repo dropped, writes the verbatim
#   settings.json (statusline, plugins, bypass permissions), and also handles
#   Codex. The cloud restore is narrower on purpose:
#
#     - ADDITIVE, not a mirror. It never deletes anything already in the home
#       dir, so cloud-provided skills/config survive.
#     - SANITIZED settings. It restores only durable preferences and drops the
#       keys that are wrong or harmful in cloud (statusline -> bun path that may
#       not exist; enabledPlugins -> slow marketplace fetch; the permission /
#       dangerous-mode skips -> let the web session's own permission mode win).
#     - Claude only. It restores ~/.claude exclusively. ~/.agents and ~/.codex
#       are not touched: Codex and the shared cross-agent files have no consumer
#       in a Claude Code web session.
#
#   See SYNC.md ("Cloud restore") for the policy this implements.

set -euo pipefail

log() { printf '[cloud-restore] %s\n' "$*"; }

# Anchor on this file's own location so it works regardless of the caller's cwd
# (the Setup script runs it from a temp clone, not the session repo root).
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HOME_DIR="${HOME:-/root}"
CLAUDE_DIR="$HOME_DIR/.claude"

# --- skills (additive) ------------------------------------------------------
if [ -d "$SRC/dotclaude/skills" ]; then
  log "restoring user skills into $CLAUDE_DIR/skills/"
  mkdir -p "$CLAUDE_DIR/skills"
  # Copy each skill dir in. Additive: existing/cloud-provided skills are kept;
  # a same-named skill on this branch overwrites that one only.
  cp -a "$SRC/dotclaude/skills/." "$CLAUDE_DIR/skills/"
else
  log "no dotclaude/skills/ in source; skipping skills."
fi

# --- user memory (CLAUDE.md) ------------------------------------------------
if [ -f "$SRC/dotclaude/CLAUDE.md" ]; then
  log "restoring $CLAUDE_DIR/CLAUDE.md"
  mkdir -p "$CLAUDE_DIR"
  cp -a "$SRC/dotclaude/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
fi

# --- settings.json (sanitized cloud profile, merged) ------------------------
# JSON merge is done in Node, which the cloud image guarantees on PATH (Claude
# Code itself runs on Node). If Node is somehow absent we skip settings rather
# than risk a broken hand-rolled merge; skills + memory still landed above.
if [ ! -f "$SRC/dotclaude/settings.json" ]; then
  log "no dotclaude/settings.json in source; skipping settings."
elif ! command -v node >/dev/null 2>&1; then
  log "node not found; skipping settings.json merge (skills + memory still restored)."
else
  log "merging sanitized settings into $CLAUDE_DIR/settings.json"
  mkdir -p "$CLAUDE_DIR"
  SRC_SETTINGS="$SRC/dotclaude/settings.json" \
  DST_SETTINGS="$CLAUDE_DIR/settings.json" \
  node <<'NODE'
const fs = require('fs');

const srcPath = process.env.SRC_SETTINGS;
const dstPath = process.env.DST_SETTINGS;

// Durable, cloud-safe top-level keys. Anything not listed is dropped from the
// restored config (but preserved if the live cloud settings already set it).
const KEEP = new Set([
  'effortLevel',
  'autoCompactWindow',
  'skillOverrides',
  'promptSuggestionEnabled',
  'awaySummaryEnabled',
  'autoMemoryEnabled',
  'autoDreamEnabled',
  'theme',
  'editorMode',
  'disableClaudeAiConnectors',
  'skipWorkflowUsageWarning',
  'fileCheckpointingEnabled',
  'useAutoModeDuringPlan',
  'model',
]);

// Non-secret env defaults to deep-merge (never the whole `env` block blindly).
const ENV_KEEP = new Set([
  'CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT',
  'CLAUDE_CODE_SUBAGENT_MODEL',
]);

// Explicitly dropped for cloud (here only as documentation of intent):
//   statusLine            -> `bun __HOME__/...`, bun not guaranteed; irrelevant in web UI
//   hooks                 -> `bun __HOME__/...` staleness hook; bun not guaranteed, and drift is noise in an ephemeral single-branch clone
//   enabledPlugins        -> marketplace fetch, slow/networked; skills restored directly
//   permissions, skipDangerousModePermissionPrompt, skipAutoPermissionPrompt,
//   skipDangerousModePermissionPrompt -> let the web session's permission mode win
//   remoteControlAtStartup, inputNeededNotifEnabled, agentPushNotifEnabled -> cloud manages its own

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return {}; }
};

const src = readJson(srcPath);
// Start from the live cloud settings so any keys the harness set survive.
const out = readJson(dstPath);

for (const [k, v] of Object.entries(src)) {
  if (KEEP.has(k)) out[k] = v;
}

if (src.env && typeof src.env === 'object') {
  const env = (out.env && typeof out.env === 'object') ? out.env : {};
  for (const [k, v] of Object.entries(src.env)) {
    if (ENV_KEEP.has(k)) env[k] = v;
  }
  if (Object.keys(env).length) out.env = env;
}

fs.writeFileSync(dstPath, JSON.stringify(out, null, 2) + '\n');
console.log('[cloud-restore] wrote', Object.keys(out).length, 'top-level settings keys');
NODE
fi

log "done."
