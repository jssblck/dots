#!/usr/bin/env bash
#
# .claude/cloud-setup.sh: the cloud "Setup script" half of the Claude Code
# environment setup pattern.
#
# WHAT THIS IS
#   The toolchain-install half of bootstrapping a Claude Code on the web session.
#   It installs tools the cloud base image does NOT ship but this repo's dev loop
#   needs. It is wired into the cloud environment's "Setup script" field with a
#   one-line guarded bootstrap:
#
#       if [ -f .claude/cloud-setup.sh ]; then bash .claude/cloud-setup.sh; fi
#
#   The Setup script runs before Claude Code launches. Treat it as something that
#   may re-run on any fresh session (it re-runs after you change the script or the
#   network allowlist, and periodically), so keep each step idempotent and cheap
#   on the no-op path: the `command -v <tool>` guards below make an
#   already-installed tool a fast skip. Put cloud-only, root/apt toolchain
#   installs here; cross-platform work that must also run locally and on resume
#   belongs in bootstrap.mjs.
#
# SCOPE
#   Cloud only, Ubuntu only. The cloud image is Ubuntu 24.04 and the script runs
#   as root, so we use apt and /usr/local/bin freely. Local dev does NOT run
#   this; bootstrap.mjs is the cross-platform half. If this is ever invoked
#   somewhere without apt, it no-ops rather than erroring.
#
# HOW TO ADAPT
#   Install ONLY tools the base image is missing AND this repo actually uses.
#   The base image already ships rust, node, python+uv, go, ruby, a JVM,
#   docker+compose, the postgres client, redis, and the language registries —
#   do not reinstall those. Probe a real cloud session first (see the skill's
#   step 2) to find genuine gaps. `gh` is the most common one and is the worked
#   example below; the commented stub after it shows how to add another tool.
#   Prefer download hosts on the default Trusted allowlist (GitHub release
#   assets, the HashiCorp apt repo, dl.k8s.io, the language registries); a host
#   that isn't on it requires widening the environment's Network access to
#   Custom.

set -euo pipefail

log() { printf '[cloud-setup] %s\n' "$*"; }

# Ubuntu/apt only. Anywhere else (e.g. a curious local run on macOS), do nothing.
if ! command -v apt-get >/dev/null 2>&1; then
  log "apt-get not found; this script targets the Ubuntu cloud image only. Skipping."
  exit 0
fi

# Map uname -> the arch slugs release artifacts use.
case "$(uname -m)" in
  x86_64)  GH_ARCH=amd64 ;;
  aarch64) GH_ARCH=arm64 ;;
  *)       GH_ARCH="" ;;
esac

# --- gh (GitHub CLI, from the published release tarball) --------------------
# Worked example: the one tool the base image is most consistently missing.
# We pull the release asset from github.com rather than the cli.github.com apt
# repo because the GitHub release-asset hosts are on the Trusted allowlist and
# cli.github.com is not. Reads GH_TOKEN from the environment if you set one.
if command -v gh >/dev/null 2>&1; then
  log "gh already present ($(gh --version | head -1)); skipping."
elif [ -z "$GH_ARCH" ]; then
  log "unsupported arch '$(uname -m)' for the gh release tarball; skipping gh."
else
  log "installing gh from its GitHub release..."
  # Resolve the latest tag in two steps (curl into a variable, THEN grep)
  # rather than `curl | grep -m1`. Under `set -o pipefail`, piping straight into
  # `grep -m1` is a race: grep exits on the first match and closes the pipe
  # while curl is still writing the (large) JSON body, so curl dies on SIGPIPE
  # with exit 23 ("Failure writing output to destination"). pipefail propagates
  # that and `set -e` turns it into a fatal abort. Buffering the body first lets
  # curl finish cleanly before grep ever runs.
  ghmeta="$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest)"
  ghver="$(printf '%s' "$ghmeta" | grep -m1 '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/')"
  if [ -z "$ghver" ]; then
    log "could not determine the latest gh release tag; skipping gh."
  else
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/gh.tar.gz" \
      "https://github.com/cli/cli/releases/download/v${ghver}/gh_${ghver}_linux_${GH_ARCH}.tar.gz"
    tar -xzf "$tmp/gh.tar.gz" -C "$tmp"
    install -m 0755 "$tmp/gh_${ghver}_linux_${GH_ARCH}/bin/gh" /usr/local/bin/gh
    rm -rf "$tmp"
    log "installed $(gh --version | head -1)"
  fi
fi

# --- stub: add another tool the same way ------------------------------------
# Copy this block per tool. Keep the `command -v` guard so a re-run is a fast
# skip. Example, an apt-repo tool (terraform from the HashiCorp apt repo):
#
# if command -v terraform >/dev/null 2>&1; then
#   log "terraform already present; skipping."
# else
#   log "installing terraform from the HashiCorp apt repo..."
#   install -d -m 0755 /etc/apt/keyrings
#   curl -fsSL https://apt.releases.hashicorp.com/gpg \
#     | gpg --dearmor --yes -o /etc/apt/keyrings/hashicorp.gpg
#   chmod a+r /etc/apt/keyrings/hashicorp.gpg
#   . /etc/os-release
#   echo "deb [signed-by=/etc/apt/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com ${VERSION_CODENAME} main" \
#     > /etc/apt/sources.list.d/hashicorp.list
#   apt-get update -qq
#   apt-get install -y -qq terraform
#   log "installed $(terraform version | head -1)"
# fi

log "done."
