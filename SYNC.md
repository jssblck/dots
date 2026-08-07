# Agent sync policy

This branch backs up selected user-level agent config so it can be restored on
any machine. An agent routine performs the sync in both directions:

- **Backup** = home -> repo
- **Restore** = repo -> home

This document is the source of truth. Copy only the allowlisted paths below.

## Directory mapping

The shared agent directory is the canonical home for instructions and skills
that can work across harnesses. Product directories contain only configuration
that cannot use the shared location.

| Repo dir | User config dir | Purpose |
| --- | --- | --- |
| `dotagents/` | `~/.agents/` | Shared Codex and Pi instructions and skills |
| `dotclaude/` | `~/.claude/` | Claude Code configuration |
| `dotcodex/` | `~/.codex/` | Codex-specific configuration |
| `dotpi/` | `~/.pi/agent/` | Pi-specific configuration |
| `dotbastion/` | Bastion platform config dir | Bastion reviewer registry |

Bastion uses `$XDG_CONFIG_HOME/bastion` on Linux (default
`~/.config/bastion`), `~/Library/Application Support/bastion` on macOS, and
`%APPDATA%\bastion` on Windows.

### Global instruction compatibility

Codex and Pi both discover `~/.agents/skills/`. Their current global
instruction discovery is product-specific:

- Codex reads `~/.codex/AGENTS.md`.
- Pi reads `~/.pi/agent/AGENTS.md`.

Keep `~/.agents/AGENTS.md` canonical. On POSIX systems, restore these relative
links:

```text
~/.codex/AGENTS.md -> ../.agents/AGENTS.md
~/.pi/agent/AGENTS.md -> ../../.agents/AGENTS.md
```

On systems that cannot create those links, write byte-identical compatibility
copies. Before backup, compare each existing compatibility file with the
canonical file. Stop and reconcile any difference instead of choosing one
silently.

### System prompts

There is no shared system-prompt location or format across Codex and Pi. Keep
intent-equivalent product files:

- `dotcodex/model-instructions.md` -> `~/.codex/model-instructions.md`
- `dotpi/SYSTEM.md` -> `~/.pi/agent/SYSTEM.md`

Codex's version includes Codex channels, tool rules, automation defaults, and
attribution. Pi's version expresses the same general communication, editing,
safety, writing, and skill behavior with Pi's tools. When either file changes,
review the other and carry over the intent that applies to both products. Do
not force the files to be byte-identical.

## Allowlist

Only the following paths are synced. Everything else is ignored.

### Shared agents

- `~/.agents/AGENTS.md` -> `dotagents/AGENTS.md` (verbatim)
- Every skill directory under `~/.agents/skills/` -> `dotagents/skills/`

Mirror the skill set exactly in both directions. A local addition, change, or
deletion must appear on the destination. Strip nested `.git/` directories from
installed skills. Keep harness metadata such as `agents/openai.yaml`; other
harnesses ignore metadata they do not use.

A skill can serve a product-specific task while still using the standard skill
format and location. For example, `hatch-pet` creates Codex app assets but lives
under `~/.agents/skills/` so any compatible agent can run the workflow.

### Claude Code

- `~/.claude/CLAUDE.md` -> `dotclaude/CLAUDE.md`
- Every skill directory under `~/.claude/skills/` -> `dotclaude/skills/`
- `~/.claude/settings.json` -> `dotclaude/settings.json` (sanitized below)
- `~/.claude/statusline-command.mjs` -> `dotclaude/statusline-command.mjs`
- `~/.claude/hooks/` -> `dotclaude/hooks/`

Claude remains separate because its instruction and skill behavior differs.
Do not converge a Claude skill with a same-named shared skill. Mirror each
source independently.

### Codex

- `~/.codex/config.toml` -> `dotcodex/config.toml` (curated below)
- `~/.codex/model-instructions.md` -> `dotcodex/model-instructions.md`

Do not back up `~/.codex/AGENTS.md` or user skills from `~/.codex/skills/`.
The instruction file is a compatibility link or copy, and user skills now live
under `~/.agents/skills/`. Preserve Codex's app-managed
`~/.codex/skills/.system/` directory during restore.

### Pi

- `~/.pi/agent/SYSTEM.md` -> `dotpi/SYSTEM.md`

Pi's settings, extensions, packages, prompts, memory, and other resources are
not part of this migration. They remain machine-local unless the allowlist is
expanded deliberately.

### Bastion

- `<Bastion platform config dir>/.bastion.yaml` ->
  `dotbastion/.bastion.yaml`

Use `.bastion.yaml` as the canonical spelling. Do not keep both `.yaml` and
`.yml` variants.

## Never sync

Never sync auth, sessions, history, logs, sqlite, caches, telemetry, runtime
state, or other machine-local data. The `.gitignore` is a safety net; this
allowlist is the primary control.

Notable exclusions include:

- `~/.claude/.credentials.json` and `~/.claude/settings.local.json`
- `~/.claude/plugins/`, including its fetched blocklist cache
- `~/.codex/auth.json`, sqlite, sessions, marketplaces, computer-use state,
  generated images, worktrees, and sandbox secrets
- `~/.pi/agent/auth.json`, settings, trust decisions, sessions, packages,
  extensions, models, memory, and run history
- Bastion data and run history

## Sanitization

Apply sanitization during backup and reverse it during restore.

### Claude `settings.json`

The status line and hooks invoke Bun scripts by absolute path. In every
`bun .../` command, replace the literal home directory with `__HOME__` during
backup. Expand `__HOME__` to the destination machine's home directory during
restore. Bun accepts forward-slash paths on Windows.

Expected tracked commands include:

```text
bun __HOME__/.claude/statusline-command.mjs
bun __HOME__/.claude/hooks/branch-staleness.mjs
```

Copy the rest of `settings.json` as durable preferences.

### Codex `config.toml`

The committed file contains durable preferences only. Strip these sections or
keys during backup:

- `notify`
- `[marketplaces.*]`
- `[projects.*]`
- `[mcp_servers.*]`
- `[hooks.state.*]`
- `[tui.model_availability_nux]`
- runtime-bundled or primary-runtime `[plugins.*]`; keep stable
  `@openai-curated` plugin enables

The tracked `model_instructions_file` points to `model-instructions.md` beside
the live config.

Restore `config.toml` by merging durable repo values into the live file. Never
overwrite live machine-specific sections. If no live config exists, write the
curated file as-is.

## Procedures

### Backup (home -> repo)

1. Compare the Codex and Pi compatibility instruction files with
   `~/.agents/AGENTS.md`. Stop on unexplained differences.
2. Copy `~/.agents/AGENTS.md` and mirror `~/.agents/skills/` into
   `dotagents/`.
3. Mirror Claude instructions, skills, hooks, status line, and sanitized
   settings into `dotclaude/`.
4. Copy the Codex model instructions and curated config into `dotcodex/`.
5. Copy Pi's `SYSTEM.md` into `dotpi/`, then review the Codex and Pi prompts for
   intent parity.
6. Copy Bastion's `.bastion.yaml` into `dotbastion/`.
7. Reconcile `claude-cloud-restore.sh` as described below.
8. Review and stage the exact allowlisted diff. Do not force-add an ignored
   file.

### Restore (repo -> home)

1. Write `dotagents/AGENTS.md` to `~/.agents/AGENTS.md` and mirror
   `dotagents/skills/` to `~/.agents/skills/`.
2. Create the Codex and Pi compatibility links above. Use byte-identical copies
   only when links are unavailable.
3. Restore Claude instructions, skills, hooks, status line, and settings. Expand
   `__HOME__` in settings.
4. Copy Codex's `model-instructions.md`, then merge the curated `config.toml`
   without clobbering machine-specific sections.
5. Copy Pi's `SYSTEM.md` to `~/.pi/agent/SYSTEM.md`.
6. Preserve `~/.codex/skills/.system/`. After confirming the shared skill
   mirror, remove other legacy entries under `~/.codex/skills/` so stale copies
   cannot diverge.
7. Restore Bastion's `.bastion.yaml` to its platform config directory.
8. Sign in to Claude, Codex, Pi, and other services separately. Never restore
   auth.

## Cloud restore for Claude Code on the web

The machine restore targets a trusted personal computer. Claude Code on the web
starts each session in a fresh container that clones only the target
repository. It does not run this sync routine or receive the tracked user
configuration.

`claude-cloud-restore.sh` covers that environment. Configure this setup command
in the Claude web environment:

```bash
d=$(mktemp -d); git clone --depth 1 --branch agents https://github.com/jssblck/dots "$d" && bash "$d/claude-cloud-restore.sh"
```

If the target repository includes the `claude-cloud-setup` skill, append its
repository toolchain setup:

```bash
[ -f .claude/cloud-setup.sh ] && bash .claude/cloud-setup.sh
```

The cloud restore has narrower rules:

- It restores Claude config only. It does not touch shared agents, Codex, Pi,
  or Bastion.
- It copies skills and `CLAUDE.md` additively. It does not delete files provided
  by the cloud environment.
- It merges durable settings into the live file and preserves harness settings.
- It drops `statusLine` and `hooks` because Bun is not guaranteed and those
  features do not help an ephemeral web checkout.
- It drops `enabledPlugins` because network marketplace installation is slow;
  skills are restored directly.
- It drops `permissions`, `skipDangerousModePermissionPrompt`, and
  `skipAutoPermissionPrompt` so the web harness controls permissions.
- It drops `remoteControlAtStartup`, `inputNeededNotifEnabled`, and
  `agentPushNotifEnabled` because the cloud surface controls them.

The script is one-directional. The ephemeral container never becomes a backup
source.

### Keep the cloud script current

Whenever a backup changes `dotclaude/settings.json`, compare its keys with the
script's keep-list and environment allow-list. Add durable preferences. Leave
machine-specific or cloud-hostile keys out and document the reason above.

The script copies skills and `CLAUDE.md` wholesale, so changes to those files do
not require script edits. Revisit copy logic when the tracked `dotclaude/`
layout changes.

If the script moves or changes name, update the setup command here and in the
README, then update the Claude web environment.
