---
name: tag-release
description: Use when asked to cut a release by tagging the default branch: "tag a release", "tag a patch release", "cut a minor release", "tag a new major version", "cut a release". Covers syncing to origin's default branch first, reading the prior release to compute the next version, tagging the exact origin HEAD in the repo's convention, pushing, and watching the release to green. Invoke with /tag-release.
user-invocable: true
---

# Tag a release

You release by tagging the default branch. Two things have to be right every
time: the tag must sit on **the current `origin` default-branch HEAD** (not a
stale or dirty local checkout), and its version and format must follow **the
repo's existing convention**. Given "tag a patch / minor / major release", sync,
read the prior release, compute the next version, tag, push, and watch the
release to green.

## 1. Sync to the origin default branch first

The tag must point at what is actually on the remote, not whatever your local
checkout happens to be at.

```sh
git fetch origin --tags --prune
```

- Confirm the working tree is clean and the local default branch matches
  `origin`. If it has diverged, is dirty, or is behind, resolve that first (fast
  forward it, or tag `origin/<default-branch>` directly so local-only commits can
  never leak into the release).
- The commit you tag is `origin/<default-branch>`'s HEAD. Do not cut a release
  from a red default branch: if the repo gates releases on CI, confirm the checks
  are green on that exact commit before tagging.

## 2. Read the prior release and the repo's convention

Never invent a format. Look at what the repo already does:

```sh
gh release list                          # if releases are forge Release objects
git tag --sort=-v:refname | head         # newest version tags first
```

From the latest release, read:

- **Version format**: a leading `v` or not, any component or package prefix (a
  monorepo may tag `pkg-name/v1.2.3`), and any pre-release or build suffix.
- **Tag kind**: lightweight, annotated, or signed. Check with
  `git cat-file -t <tag>` (a `tag` object means annotated/signed, a `commit` means
  lightweight) and `git verify-tag <tag>` for signing.
- **Release mechanism**: whether a release is just a pushed tag (a pipeline picks
  it up), or an explicit forge Release created with `gh release create`.

If there is no prior release, there is nothing to bump from: use the repo's
documented starting version, or ask which to use.

## 3. Compute the next version

Semantic bump from the latest version, preserving its exact format (keep the
leading `v`, any prefix, drop a pre-release suffix unless asked to keep one):

- **patch**: `x.y.(z+1)`
- **minor**: `x.(y+1).0`
- **major**: `(x+1).0.0`

State the computed tag and the commit SHA it will point at before you create it,
so the version and target are visible and correctable.

## 4. Create the tag, matching convention

Tag the origin default HEAD explicitly so it can never pick up a local-only
commit. Match the kind of the prior tags:

```sh
# lightweight (prior tags are lightweight):
git tag <version> origin/<default-branch>

# annotated (prior tags are annotated):
git tag -a <version> origin/<default-branch> -m "<version>"
```

Watch the signing gotcha: a global `tag.gpgsign = true` will silently turn even a
lightweight or annotated tag into a signed one. If the repo's existing tags are
unsigned, pass `--no-sign` so the new tag matches. If they are signed, sign it.

## 5. Push, then watch the release to green

```sh
git push origin <version>
```

If the convention is an explicit forge release rather than a bare tag, create it
that way instead (`gh release create <version> ...`, matching how prior releases
set their title, notes, and assets). Then confirm the outcome:

```sh
gh run watch <run-id> --exit-status --interval 20   # if a pipeline runs on the tag
gh release view <version>                            # confirm it published, with assets
```

Do not call it done until the release pipeline is green and the release (and any
artifacts it should produce) actually exists.

## 6. Report

State the version you cut, the commit SHA it points at, how it was tagged
(lightweight / annotated / signed), and the release or pipeline result.

## Standing rules

- Always tag the current `origin` default-branch HEAD; never a stale, local-only,
  or dirty commit. Fetch first, every time.
- Follow the repo's version format, tag kind, and release mechanism exactly; read
  the prior release, do not assume.
- Confirm before pushing when anything is ambiguous: no prior release, an
  inconsistent tag history, a dirty or diverged local checkout, or a default
  branch that is not green. Otherwise proceed; you were invoked to cut it.
- A pushed release tag is outward and hard to reverse. Get the version and target
  commit right before pushing, not after.
- No em-dashes in the tag message or the summary.
