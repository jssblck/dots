---
name: electron-control
description: Interact with existing Electron apps like Slack via agent-browser in CDP mode. Use when an already-running Electron app exposes a remote debugging port or WebSocket URL.
---

# Electron control

Use `agent-browser` in CDP mode against an already-running Electron app.

This skill is the default path for Slack and other Chromium-based desktop apps that expose Chrome DevTools Protocol access.

## Core rules

- Attach to an existing app via `agent-browser connect <port|url>` or `agent-browser --cdp <port|url> ...`.
- Never run `agent-browser close` unless Jess explicitly asks to close the attached app.
- Default to read-only inspection first: `tab`, `get url`, `get title`, `snapshot`, `screenshot`, `eval`, `console`, `errors`.
- Treat clicks, typing, keypresses, downloads, clipboard writes, and anything that could send a message or change settings as state-changing actions. Only do them when the user clearly asked for them.
- If the app is not exposing CDP yet, stop and ask Jess to provide the port or relaunch the app with a remote debugging flag.
- Re-run `snapshot` after any UI-changing action.
- Prefer refs from `snapshot` over brittle selectors when possible.

## Connecting

Connect once, then run commands without `--cdp`:

```bash
agent-browser connect 9222
agent-browser tab
agent-browser snapshot
```

Or pass the port or WebSocket URL on each command:

```bash
agent-browser --cdp 9222 tab
agent-browser --cdp "ws://127.0.0.1:9222/devtools/browser/..." snapshot
```

If the Electron app needs a launch flag, ask Jess before suggesting or using it. A common pattern is:

```bash
--remote-debugging-port=9222
```

## Standard workflow

1. Attach to the app with `connect <port|url>` or `--cdp <port|url>`.
2. Enumerate targets with `agent-browser tab`.
3. Switch targets with `agent-browser tab <n>` if needed.
4. Inspect with `snapshot`, `get url`, `get title`, `eval`, `console`, `errors`, and `screenshot`.
5. Only after explicit user intent, interact with `click`, `fill`, `type`, `keyboard inserttext`, or `press`.
6. Re-snapshot after UI changes.
7. Leave the app running. Do not call `close`.

## Slack-specific notes

- Start with `tab` and `snapshot`. Slack may expose multiple windows, workspaces, or webviews.
- Treat message sending as destructive. Do not type into a compose box or press Enter unless Jess explicitly asks.
- Prefer inspection commands first: `snapshot`, `get text`, `eval`, `console`, `errors`, and `screenshot`.
- If Slack or another Electron app shows OS auth, SSO, or permission prompts, hand control back to Jess.

## Related skills

- For Slack-specific behavior, restart approval flow, and safer wording around relaunching Slack with a debugging port, see `slack-browser`.


## High-signal commands

```bash
agent-browser --cdp 9222 tab
agent-browser --cdp 9222 get title
agent-browser --cdp 9222 get url
agent-browser --cdp 9222 snapshot
agent-browser --cdp 9222 screenshot /tmp/electron.png
agent-browser --cdp 9222 eval "location.href"
agent-browser --cdp 9222 console
agent-browser --cdp 9222 errors
agent-browser --cdp 9222 click "@e5"
agent-browser --cdp 9222 keyboard inserttext "hello"
```
