# WSL agent host

This directory records the reproducible part of the `grace-wsl` setup: an Ubuntu WSL distro on the D-backed VHD, used as a remote agent/dev box over Tailscale.

Secrets stay machine-local. The bootstrap installs tools and configures services. Tailscale, Claude, Codex, GitHub, SSH, and Akari still need machine-local auth.

## Files

- `bootstrap-ubuntu.sh`: installs packages, toolchains, shell config, Docker, systemd timers, and maintenance guardrails.
- `verify.sh`: read-only smoke check for tools, services, shell hooks, Docker, Tailscale, Git signing, and disk usage.
- `packages.apt`: Ubuntu package baseline.
- `cargo-tools.txt` and `npm-tools.txt`: user-level CLI tools installed by the bootstrap.
- `shell/`: versioned Bash environment and interactive hooks.
- `systemd/` and `bin/`: templates for Akari sync and Docker maintenance.
- `templates/`: redacted examples for machine-local config.
- `windows/.wslconfig.example`: Windows-side WSL VM policy used for this host.

## First run

Run from inside the target Ubuntu WSL distro:

```bash
cd ~/projects/dots
sudo ./wsl/bootstrap-ubuntu.sh
```

Useful overrides:

```bash
sudo WSL_HOSTNAME=grace-wsl AGENT_USER=me ./wsl/bootstrap-ubuntu.sh
```

The script assumes Ubuntu with systemd enabled. If `/etc/wsl.conf` changes, restart WSL from Windows:

```powershell
wsl --shutdown
wsl -d agents
```

## Machine-local setup

These steps are intentionally outside Git.

### Tailscale

Authenticate the WSL node after install:

```bash
sudo tailscale up --hostname=grace-wsl --accept-dns=false --operator="$USER"
```

If this node needs to appear in two tailnets, share the machine from the Tailscale admin console. Disable key expiry for this node if it should stay reachable without periodic re-auth.

### SSH and GitHub

Copy or generate SSH keys in `~/.ssh/`, then verify:

```bash
ssh -T git@github.com
```

The bootstrap sets Git signing to use `~/.ssh/github_jssblck_local_ed25519` and `~/.ssh/allowed_signers` when those files exist. It does not create or commit key material.

### Akari

Create the client config with a real ingest token:

```bash
akari login --server https://akari.jessica.black --token '<ingest-token>'
```

`akari-sync.timer` is installed even before login. The service exits cleanly until `~/.config/akari/config.toml` exists.

### Claude and Codex

Restore public skills/config from this repo as usual, then sign in separately. Do not copy `~/.claude/.credentials.json` or `~/.codex/auth.json` into Git.

## Maintenance

The bootstrap configures:

- Docker log rotation via `/etc/docker/daemon.json`.
- `docker-maintenance.timer`, weekly prune of old stopped containers, dangling images, unused networks, and BuildKit cache. It does not prune volumes.
- `akari-sync.timer`, every 10 minutes: `akari update` then `akari sync`.
- journald capped at 512 MB, with 20 GB kept free and 30 days max retention.
- Ubuntu's existing apt timers and unattended upgrades remain in place.

Run a read-only check any time:

```bash
./wsl/verify.sh
```
