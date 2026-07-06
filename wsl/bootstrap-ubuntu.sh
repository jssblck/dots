#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_USER="${AGENT_USER:-${SUDO_USER:-${USER:-me}}}"
WSL_HOSTNAME="${WSL_HOSTNAME:-grace-wsl}"
GIT_USER_NAME="${GIT_USER_NAME:-Jessica Black}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-me@jessica.black}"
AKARI_SERVER_URL="${AKARI_SERVER_URL:-https://akari.jessica.black}"

if [ "$EUID" -ne 0 ]; then
	exec sudo -E AGENT_USER="$AGENT_USER" WSL_HOSTNAME="$WSL_HOSTNAME" GIT_USER_NAME="$GIT_USER_NAME" GIT_USER_EMAIL="$GIT_USER_EMAIL" AKARI_SERVER_URL="$AKARI_SERVER_URL" bash "$0" "$@"
fi

AGENT_HOME="$(getent passwd "$AGENT_USER" | cut -d: -f6)"
if [ -z "$AGENT_HOME" ] || [ ! -d "$AGENT_HOME" ]; then
	echo "Could not resolve home directory for AGENT_USER=$AGENT_USER" >&2
	exit 1
fi

log() {
	printf '\n==> %s\n' "$*"
}

install_keyring_from_url() {
	local url=$1
	local target=$2
	local tmp
	tmp="$(mktemp)"
	curl -fsSL "$url" | gpg --dearmor >"$tmp"
	install -m 0644 "$tmp" "$target"
	rm -f "$tmp"
}

install_apt_sources() {
	log "Configuring external apt repositories"
	# shellcheck source=/dev/null
	. /etc/os-release
	install -d -m 0755 /etc/apt/keyrings

	install_keyring_from_url "https://download.docker.com/linux/ubuntu/gpg" /etc/apt/keyrings/docker.gpg
	cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable
EOF

	curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg >/etc/apt/keyrings/githubcli-archive-keyring.gpg
	chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
	cat >/etc/apt/sources.list.d/github-cli.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main
EOF

	install_keyring_from_url "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" /etc/apt/keyrings/nodesource.gpg
	cat >/etc/apt/sources.list.d/nodesource.list <<EOF
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main
EOF

	curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${VERSION_CODENAME}.noarmor.gpg" >/usr/share/keyrings/tailscale-archive-keyring.gpg
	curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${VERSION_CODENAME}.tailscale-keyring.list" >/etc/apt/sources.list.d/tailscale.list
}

install_apt_packages() {
	log "Installing Ubuntu package baseline"
	apt-get update
	mapfile -t packages < <(grep -vE '^\s*(#|$)' "$SCRIPT_DIR/packages.apt")
	DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
}

configure_wsl_and_services() {
	log "Writing WSL, SSH, Docker, and journal config"
	cat >/etc/wsl.conf <<EOF
[boot]
systemd=true

[network]
hostname=${WSL_HOSTNAME}

[user]
default=${AGENT_USER}

[automount]
enabled=false
mountFsTab=false

[interop]
enabled=true
appendWindowsPath=false

[gpu]
enabled=false
EOF

	install -d -m 0755 /etc/docker
	cat >/etc/docker/daemon.json <<'EOF'
{
  "features": {
    "buildkit": true
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

	install -d -m 0755 /etc/ssh/sshd_config.d
	cat >/etc/ssh/sshd_config.d/99-agent-host.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AllowUsers ${AGENT_USER}
AllowTcpForwarding yes
EOF

	install -d -m 0755 /etc/systemd/journald.conf.d
	cat >/etc/systemd/journald.conf.d/wsl-agent-limits.conf <<'EOF'
[Journal]
SystemMaxUse=512M
SystemKeepFree=20G
MaxRetentionSec=30day
EOF
}

render_template() {
	local src=$1
	local dst=$2
	local mode=$3
	sed -e "s#__AGENT_USER__#${AGENT_USER}#g" -e "s#__AGENT_HOME__#${AGENT_HOME}#g" "$src" >"$dst"
	chmod "$mode" "$dst"
}

install_systemd_units() {
	log "Installing Akari and Docker maintenance units"
	render_template "$SCRIPT_DIR/bin/akari-sync-wsl" /usr/local/bin/akari-sync-wsl 0755
	install -m 0755 "$SCRIPT_DIR/bin/docker-maintenance-wsl" /usr/local/bin/docker-maintenance-wsl
	render_template "$SCRIPT_DIR/systemd/akari-sync.service" /etc/systemd/system/akari-sync.service 0644
	install -m 0644 "$SCRIPT_DIR/systemd/akari-sync.timer" /etc/systemd/system/akari-sync.timer
	install -m 0644 "$SCRIPT_DIR/systemd/docker-maintenance.service" /etc/systemd/system/docker-maintenance.service
	install -m 0644 "$SCRIPT_DIR/systemd/docker-maintenance.timer" /etc/systemd/system/docker-maintenance.timer
}

install_starship() {
	log "Installing Starship"
	curl -fsSL https://starship.rs/install.sh | sh -s -- -y -b /usr/local/bin
}

install_user_tooling() {
	log "Installing user-level toolchains and CLIs"
	runuser -u "$AGENT_USER" -- env HOME="$AGENT_HOME" USER="$AGENT_USER" LOGNAME="$AGENT_USER" DOTS_WSL_DIR="$SCRIPT_DIR" AKARI_SERVER_URL="$AKARI_SERVER_URL" bash -s <<'USER_SCRIPT'
set -euo pipefail
export NPM_CONFIG_PREFIX="$HOME/.local/share/npm"
export GOPATH="$HOME/go"
export PATH="$HOME/.local/bin:$HOME/.local/share/npm/bin:$HOME/.cargo/bin:$HOME/.bun/bin:$HOME/go/bin:$HOME/.config/varlock/bin:$PATH"
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/npm" "$HOME/go/bin" "$HOME/.config"

if ! command -v rustup >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
fi
. "$HOME/.cargo/env"
rustup toolchain install stable
rustup default stable

if ! command -v uv >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
else
    uv self update || true
fi

if ! command -v bun >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash
else
    bun upgrade || true
fi

npm config set prefix "$NPM_CONFIG_PREFIX"
while IFS= read -r package; do
    [ -n "$package" ] || continue
    npm install -g "$package"
done < "$DOTS_WSL_DIR/npm-tools.txt"

while IFS= read -r crate; do
    [ -n "$crate" ] || continue
    cargo install --locked --force "$crate"
done < "$DOTS_WSL_DIR/cargo-tools.txt"

curl -fsSL https://raw.githubusercontent.com/attunehq/doteph/main/scripts/install.sh | bash -s -- -b "$HOME/.local/bin"
curl -fsSL https://raw.githubusercontent.com/jssblck/bastion/main/scripts/install.sh | bash -s -- -b "$HOME/.local/bin"
curl -fsSL https://raw.githubusercontent.com/jssblck/akari/main/scripts/install.sh | sh
curl -fsSL https://varlock.dev/install.sh | sh -s

starship preset plain-text-symbols -o "$HOME/.config/starship.toml"
node "$DOTS_WSL_DIR/install-shell.mjs"
ln -sfn "$HOME/.cargo/bin/btm" "$HOME/.local/bin/bottom"
touch "$HOME/.sudo_as_admin_successful"
USER_SCRIPT
}

configure_git() {
	log "Configuring Git defaults"
	runuser -u "$AGENT_USER" -- env HOME="$AGENT_HOME" GIT_USER_NAME="$GIT_USER_NAME" GIT_USER_EMAIL="$GIT_USER_EMAIL" bash -s <<'USER_SCRIPT'
set -euo pipefail

git config --global user.name "$GIT_USER_NAME"
git config --global user.email "$GIT_USER_EMAIL"
git config --global init.defaultBranch main
git config --global push.autoSetupRemote true
git config --global fetch.prune true
git config --global pull.ff only
git config --global rebase.autostash true
git config --global rerere.enabled true
git config --global branch.sort -committerdate
git config --global tag.sort version:refname
git config --global tag.gpgSign true
git config --global column.ui auto
git config --global color.ui auto
git config --global core.autocrlf input
git config --global core.sshCommand ssh
git config --global pager.diff riff
git config --global pager.show riff
git config --global pager.log riff
git config --global interactive.diffFilter 'riff --color=on'
git config --global alias.st 'status --short --branch'
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.sw switch
git config --global alias.lg 'log --graph --decorate --oneline --all'
git config --global alias.last 'log -1 --stat'
git config --global alias.unstage 'restore --staged'
git config --global alias.discard restore
git config --global alias.amend 'commit --amend'
git config --global filter.lfs.clean 'git-lfs clean -- %f'
git config --global filter.lfs.smudge 'git-lfs smudge -- %f'
git config --global filter.lfs.process 'git-lfs filter-process'
git config --global filter.lfs.required true
git config --global url.git@github.com:.insteadOf https://github.com/

if [ -f "$HOME/.ssh/github_jssblck_local_ed25519" ]; then
    git config --global gpg.format ssh
    git config --global user.signingkey "$HOME/.ssh/github_jssblck_local_ed25519"
    git config --global commit.gpgSign true
    git config --global gpg.ssh.program /usr/bin/ssh-keygen
fi
if [ -f "$HOME/.ssh/allowed_signers" ]; then
    git config --global gpg.ssh.allowedSignersFile "$HOME/.ssh/allowed_signers"
fi
USER_SCRIPT
}

enable_services() {
	log "Enabling services and timers"
	usermod -aG docker "$AGENT_USER"
	systemctl daemon-reload
	systemctl enable --now docker.service ssh.service tailscaled.service akari-sync.timer docker-maintenance.timer
	systemctl restart systemd-journald || true
}

main() {
	install_apt_sources
	install_apt_packages
	configure_wsl_and_services
	install_systemd_units
	install_starship
	install_user_tooling
	configure_git
	enable_services

	log "Bootstrap complete"
	echo "If /etc/wsl.conf changed, run 'wsl --shutdown' from Windows and restart the distro."
	echo "Authenticate Tailscale with: sudo tailscale up --hostname=${WSL_HOSTNAME} --accept-dns=false --operator=${AGENT_USER}"
	echo "Authenticate Akari with: akari login --server ${AKARI_SERVER_URL} --token '<ingest-token>'"
}

main "$@"
