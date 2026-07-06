# Working in wsl/

This directory is public bootstrap code for the WSL agent host. Never add live auth, tokens, private keys, Tailscale state, Akari config with a token, VHD exports, or machine logs here.

Prefer idempotent scripts. A second run should converge the host instead of depending on first-run state. Scripts should fail closed when a required command or config is missing, except for explicitly optional machine-local credentials.

Before calling the setup done, run:

```bash
bash -n wsl/*.sh wsl/bin/*
shellcheck wsl/*.sh wsl/bin/*
node --check wsl/install-shell.mjs
wsl/verify.sh
```
