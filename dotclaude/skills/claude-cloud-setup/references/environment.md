# The cloud environment (web-UI config)

The repo files do all the real work; the cloud "environment" object is a thin
shell that points at the repo and holds almost nothing. Open the environment
dialog in Claude Code on the web (cloud icon → add/edit environment) and set
four fields.

| Field | Value |
|-------|-------|
| **Name** | anything (e.g. `Default`) |
| **Network access** | **Trusted** to start; widen to **Custom** only for hosts you proved you need |
| **Environment variables** | leave empty unless you have non-secret values (see below) |
| **Setup script** | `if [ -f .claude/cloud-setup.sh ]; then bash .claude/cloud-setup.sh; fi` |

## Setup script

Use the guarded one-liner verbatim:

```bash
if [ -f .claude/cloud-setup.sh ]; then bash .claude/cloud-setup.sh; fi
```

The guard means one environment can serve repos that *don't* ship a
`cloud-setup.sh` — no file is a clean skip and the session still starts — while
still running and surfacing real install failures where the file does exist.
Keep the heavy logic in `cloud-setup.sh`, not in this field, so it's versioned
and reviewable.

## Network access

- **Trusted** (default) covers the common download hosts: GitHub release assets,
  the HashiCorp apt repo, `dl.k8s.io`, and the standard language package
  registries. Start here.
- **Custom** keeps the default list and lets you add specific hosts. Switch to
  it only for a host you proved you need — for example a tool whose installer or
  a runtime that fetches from a host not on the Trusted list.

Worked example of a real gap: Terraform. `terraform fmt` works fully offline,
but `terraform init` / `validate` / `plan` need provider downloads from
`registry.terraform.io`, which is **not** on the Trusted allowlist (and `plan`
also needs a state backend + cloud credentials the environment may not have). To
enable those, set Network access to **Custom**, keep the default list, and add
`registry.terraform.io`. The general rule: prove the gap, then add the single
host — don't open the network wider than the proven need.

## Environment variables — keep secrets out

This field is **visible to everyone who can use the environment**. Never put
secrets in it, and never commit them to the repo.

- Non-secret defaults (region, feature flags, a compose-service URL) can go in
  `bootstrap.mjs`'s `writeEnvVars()` so they're versioned — that's preferred over
  this field.
- Real secrets (tokens, keys) have no good home in versioned config or this
  shared field. Provide them out of band per the platform's secret mechanism,
  and have scripts read them from the environment (e.g. `gh` reading `GH_TOKEN`)
  rather than hard-coding them anywhere.
