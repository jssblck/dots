---
name: ssh-debugging
description: Troubleshoot SSH auth and terminal input issues on Jess's Macs, including 1Password SSH agent key selection, "too many authentication failures", and Ghostty backspace sending "^@" over SSH.
---

# SSH Debugging

Use this skill when SSH login fails, key auth is flaky, or terminal keys behave strangely after connecting.

## Local environment assumptions

- SSH agent socket: `~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock`
- 1Password allowed keys config: `~/.config/1Password/ssh/agent.toml`
- SSH config: `~/.ssh/config`

## Known host: fieldguide-jess

Use this host block:

```sshconfig
Host fieldguide-jess
	HostName fieldguide-jess
	User jessica
	IdentityAgent "~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
	IdentityFile ~/.ssh/fieldguide_jess.pub
	IdentitiesOnly yes
	PreferredAuthentications publickey,password,keyboard-interactive
```

Key source for this host:

- 1Password item: `fieldguide-jess-macbook`
- Vault: `Employee`

## Fix: too many authentication failures

1. Confirm the 1Password key is visible:

```bash
SSH_AUTH_SOCK="$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock" ssh-add -L
```

2. Ensure `~/.config/1Password/ssh/agent.toml` includes:

```toml
[[ssh-keys]]
vault = "Employee"
```

3. Create/update the explicit public key file used by `IdentityFile`:

```bash
cat > ~/.ssh/fieldguide_jess.pub <<'EOF'
ssh-ed25519 <public-key-material> fieldguide-jess-macbook
EOF
chmod 644 ~/.ssh/fieldguide_jess.pub
```

4. Verify effective SSH config:

```bash
ssh -G fieldguide-jess | grep -E '^(user|identityagent|identityfile|identitiesonly|preferredauthentications) '
```

5. Verify authentication path:

```bash
ssh -vv -o BatchMode=yes -o ConnectTimeout=8 jessica@fieldguide-jess true 2>&1 | grep -E 'Offering public key|Server accepts key|Authenticated to'
```

## Fix: backspace sends "^@" over SSH (Ghostty)

Symptom: in remote shell, `Ctrl+V` then Backspace prints `^@`.

Apply remote fix in `~/.zshrc` on the target host:

```zsh
# pi-backspace-fix for Ghostty over SSH
if [[ "$TERM" == "xterm-ghostty" ]]; then
  bindkey "^@" backward-delete-char
  bindkey "^?" backward-delete-char
  bindkey "^H" backward-delete-char
  stty erase "^?"
fi
```

Then reconnect SSH.

## Optional: remote terminfo for Ghostty

If remote lacks `xterm-ghostty`, install from local machine:

```bash
infocmp -x xterm-ghostty | ssh jessica@fieldguide-jess 'mkdir -p ~/.terminfo && tic -x -o ~/.terminfo /dev/stdin'
```

## Guardrails

- Do not copy private keys to the remote host.
- Remote host should receive public keys only in `~/.ssh/authorized_keys`.
- Prefer scoped per-host SSH config over global config changes.
