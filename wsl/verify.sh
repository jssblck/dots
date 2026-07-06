#!/usr/bin/env bash
set -euo pipefail

section() {
	printf '\n== %s ==\n' "$*"
}

check_command() {
	local cmd=$1
	if command -v "$cmd" >/dev/null 2>&1; then
		printf '%-18s %s\n' "$cmd" "$(command -v "$cmd")"
	else
		printf '%-18s MISSING\n' "$cmd"
		return 1
	fi
}

section "Core commands"
missing=0
for cmd in starship eza zoxide jaq jless rg psql riff tokei varlock xh cargo-nextest btm bottom direnv eph bastion akari codex claude uv rustup cargo go bun node yarn pnpm docker gh; do
	check_command "$cmd" || missing=1
done

section "Versions"
starship --version | head -n 1 || true
eza --version | head -n 1 || true
zoxide --version || true
jaq --version || true
jless --version || true
rg --version | head -n 1 || true
psql --version || true
riff --version || true
tokei --version || true
varlock --version || true
xh --version || true
cargo nextest --version || true
btm --version || true
direnv version || true
eph --version || true
bastion --version || true
akari version || true
codex --version || true
claude --version || true
uv --version || true
rustc --version || true
go version || true
bun --version || true
node --version || true
yarn --version || true
pnpm --version || true
docker --version || true
docker compose version || true
gh --version | head -n 1 || true

section "Services"
if command -v systemctl >/dev/null 2>&1; then
	systemctl is-active docker ssh tailscaled akari-sync.timer docker-maintenance.timer || true
	systemctl list-timers --all --no-pager | grep -E 'akari-sync|docker-maintenance|apt-daily|logrotate' || true
fi

section "Tailscale"
if command -v tailscale >/dev/null 2>&1; then
	tailscale status --json 2>/dev/null | jq -r '[.BackendState,.Self.DNSName,(.Self.TailscaleIPs|join(",")),(.Self.Online|tostring)] | @tsv' || tailscale status --peers=false || true
fi

section "Docker"
docker info --format 'DockerRootDir={{.DockerRootDir}} ServerVersion={{.ServerVersion}}' 2>/dev/null || true
docker system df 2>/dev/null || true

section "Shell"
bash -lic 'alias ll; alias tree; alias jq; type -t z; declare -p PROMPT_COMMAND 2>/dev/null || true' 2>/dev/null || true

section "Git"
git config --global --get-regexp '^(user|gpg|commit|pager|interactive|core\.sshcommand|core\.autocrlf)\.' | sort || true
if [ -S "${SSH_AUTH_SOCK:-}" ] || [ -f "$HOME/.ssh/github_jssblck_local_ed25519" ]; then
	tmp=$(mktemp -d)
	trap 'rm -rf "$tmp"' EXIT
	git -C "$tmp" init -q
	printf 'signed test\n' >"$tmp/file.txt"
	git -C "$tmp" add file.txt
	if git -C "$tmp" commit -q -m 'Verify SSH signing' 2>/dev/null; then
		git -C "$tmp" log --show-signature -1 --format='%h %G? %an <%ae> %s' || true
	else
		echo "Git signing test skipped or failed. Check SSH key availability."
	fi
fi
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true

section "Akari config"
if [ -f "$HOME/.config/akari/config.toml" ]; then
	sed -E 's/(token[[:space:]]*=[[:space:]]*").*(")/\1<redacted>\2/' "$HOME/.config/akari/config.toml"
else
	echo "missing: $HOME/.config/akari/config.toml"
fi

section "Disk"
df -h / /var/lib/docker "$HOME/projects" 2>/dev/null | tail -n +2 || df -h /

exit "$missing"
