---
name: merge-open-prs
description: Merge all or several open pull requests through GitHub in the safest order, resolving textual and semantic conflicts and verifying the accumulated result. Use when the user says "merge all open PRs", asks Codex to choose a merge order, requests conflict resolution across PRs, or chains those merges into a release.
---

# Merge all open PRs

Identify the in-scope PRs, choose an order that minimizes conflicts, and merge
them through GitHub. Resolve textual and semantic conflicts and verify the
accumulated tree after each merge.

**Every in-scope PR lands through the forge (`gh pr merge`), never by rewriting
the local default branch.** Each PR must end in GitHub's Merged state, in the
chosen order, on its own inspected head commit. Do not merge branches into a
local `main` and push that, and do not push commits straight to the default
branch. Local git work happens only on a *PR's own branch*, to
prepare it for a clean server-side merge. This runs against the default branch as
the base; the request sometimes appends "then cut a release", in which case see
the last section.

Work the whole thing to a finished, verified state. Do not merge blind off the
PR list, and do not stop at "they probably do not conflict": prove it.

## 1. Enumerate the open PRs

```sh
gh api --paginate 'repos/{owner}/{repo}/pulls?state=open&per_page=100' \
  --jq '.[] | {number,title,headRefName:.head.ref,headRefOid:.head.sha,baseRefName:.base.ref,baseRefOid:.base.sha,author:.user.login,isDraft:.draft,updatedAt:.updated_at}'
```

Then, for anything but the most trivial case, build a real file-overlap map
before deciding order. For each PR:

```sh
gh pr view <n> --json title,body,files,headRefName,headRefOid,baseRefName,baseRefOid,headRepository,headRepositoryOwner,isCrossRepository,maintainerCanModify,isDraft,reviewDecision,statusCheckRollup,mergeable,mergeStateStatus,additions,deletions,changedFiles
gh pr diff <n>
```

The paginated query must reach every page. Record whether each PR is a draft,
has requested changes, or has pending or failing checks. Do not merge a known
unready PR without explicit user direction, even when repository protection would
allow it.

What matters: `mergeable` state, the changed-file set per PR (the thing that
determines textual conflicts), `additions`/`deletions` (blast radius), and
`headRefName` (the branch you push to when a PR needs conflict resolution).

A PR whose `baseRefName` is another PR's `headRefName` (not the default branch)
is *stacked* on that PR. When you see this, the PRs form a chain and the
per-PR-into-main strategy below is the wrong tool: see "Stacked PRs".

## 2. Choose the merge order

The overlap map drives everything. Two files-disjoint PRs cannot produce a
Git-level textual conflict in any order, so ordering is only about semantics and
verifiability. Heuristics, in priority order:

- **Small, isolated, disjoint PRs first.** One-file config tweaks and dependency
  bumps are free wins that get out of the way. If a PR's changes make the rest
  easier to verify (a tooling or test-infrastructure PR), land it first so you can
  lean on it while merging the others.
- **Foundational before dependent.** When a cluster of PRs overlaps, merge the one
  the others build on first, then its dependents.
- **Shared-state PRs last.** Anything that bumps a shared version constant, a
  migration or sequence number, or a checked-in generated artifact compounds with
  the others: hold it for last and verify it against the fully accumulated tree.
- **When nothing overlaps at all**, order by blast radius and verifiability:
  smallest and most isolated first, largest and riskiest last, so each step is
  cheap to check and the risky one is verified against everything else already in.

State the order and the one-line reason for each before you start merging.

## Stacked PRs: collapse the stack, do not ladder it into main

A *stack* is PRs chained by base branch: only the bottom targets the default
branch, each higher one targets the branch below it (its `baseRefName` is another
PR's `headRefName`). The section-1 `gh pr list` already reveals this: map each
PR's `headRefName` to the PR whose base it is.

Do not merge a stack bottom-up, rung by rung, into the default branch:

- **It orphans the next PR's base.** Merging the bottom PR with `--delete-branch`
  removes the branch the next PR is based on. GitHub then either silently
  retargets that child onto the default branch or, often, *closes* it, and a child
  closed after its base branch is gone cannot be reopened until you recreate the
  branch.
- **Strict checks re-run per rung.** Under a strict required-status-checks policy
  each retargeted child is now behind the advanced base and must `update-branch`
  and sit through a fresh CI cycle. An N-deep stack costs N serial CI waits.

Instead, **collapse the stack into its lowest open PR, then merge that one PR into
the default branch once.** Work top-down, merging each PR into its *parent branch*
so nothing is orphaned. Check the actual protection and rulesets that apply to
every parent branch; internal stack branches may also be gated.

```sh
# stack: main <- A <- B <- C   (A bottom, C top)
gh pr merge C <verified-method-flag> --match-head-commit <verified-C-sha>
gh pr merge B <verified-method-flag> --match-head-commit <verified-B-sha>
# A's branch now holds A+B+C, and CI already ran green over that exact tree
gh pr merge A <verified-method-flag> --delete-branch --match-head-commit <verified-A-sha>
```

When squash is allowed and matches repository convention, give the final squash
one combined commit message referencing every folded PR number, such as
`Combine stacked changes (#12, #13, #14)`. Otherwise use the verified allowed
method and report the resulting history shape. Record the parent branch's
`baseRefOid` during preparation. Re-read
both the head and base SHA immediately before each internal or final merge. If
either changed, re-prepare and re-test the accumulated tree. Because the top
branch already contained the
whole stack and already ran CI green over the combined tree, the final merge is
pre-verified and conflict-free.

Notes:

- **A partly-merged stack collapses the remainder.** If the bottom PR already
  landed on the default branch on its own, the next PR up retargets to the default
  branch; fold the rest top-down into it and merge once. The separately-merged
  bottom does not conflict: its squashed content matches the copy already in the
  stacked branch.
- **One combined commit, not one per PR.** Usually what you want for a stack, but
  it is the user's call. If they want distinct merges, ladder them but retarget
  each child to the default branch *before* deleting any base branch, and budget
  the per-rung CI waits.
- **Recovery if a child was auto-closed with its base gone:** recreate the base
  branch at the parent's old head (`gh pr view <parent> --json headRefOid`, then
  `git push origin <sha>:refs/heads/<baseRefName>`), `gh pr reopen <child>`,
  retarget with `gh pr edit <child> --base <default>`, then delete the temporary
  branch.

## 3. Know the gate before you start

Two things decide how each `gh pr merge` behaves. Learn both up front, once:

**The merge method.** Match the repo's history convention; do not assume it.

```sh
gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed
```

If the repo is squash-only and its history is one squashed commit per PR, pass
`--squash` on every merge. Use whichever single method the repo allows and its
history uses.

**What blocks a merge.** Classic branch protection and the newer rulesets are
separate, and a repo can gate purely through a ruleset while the protection
endpoint reports nothing. Check both:

```sh
gh api repos/{owner}/{repo}/branches/{branch}/protection   # may 404 even when gated
gh api repos/{owner}/{repo}/rulesets                        # rulesets gate too
gh api repos/{owner}/{repo}/rulesets/<id>                   # required checks, review count, strict?
```

You are looking for: required status checks, required reviews, and whether the
policy is *strict* (branch must be current with base before merging). These
decide whether a clean PR merges immediately, needs its checks green first, or
needs its branch brought up to date.

## 4. Merge each PR through GitHub, in order

Go one PR at a time, in the chosen order. Each server-side merge advances the
default branch, so `git fetch` between merges and treat the freshly advanced base
as what the next PR must merge onto.

Preserve the user's active checkout. If local preparation or final verification
is needed, create a dedicated temporary worktree and remove it after the workflow.
Do not switch branches, discard changes, or overwrite files in the active
worktree.

### 4a. The clean case

A PR whose files do not collide with anything already landed merges directly:

```sh
gh pr view <n> --json headRefOid,baseRefOid   # both must match verified SHAs
gh pr merge <n> <verified-method-flag> --delete-branch --match-head-commit <verified-sha>
```

`--match-head-commit` pins the head only. Compare `baseRefOid` yourself
immediately before merging. If the base advanced after preparation or CI, update
or re-prepare the PR and repeat the affected checks before merging.

- Add `--auto` to let GitHub land it once required checks pass (good when the
  PR's own CI is trustworthy and you would rather wait than bypass).
- Use `--admin` only after obtaining explicit user approval for that specific PR
  and bypass. Required reviews, merge queues, security checks, and organization
  policy cannot be replaced categorically by local tests. Disclose every bypass
  in the report.
- If a ruleset is strict and a branch is behind, `gh pr update-branch <n>` brings
  it current first (or prepare the branch as in 4b).

Right after a push or a base advance, `mergeable`/`mergeStateStatus` can read
`UNKNOWN` or a stale `CONFLICTING` while GitHub recomputes. Wait a few seconds and
re-read `gh pr view <n> --json mergeable,mergeStateStatus` before concluding a PR
truly conflicts.

### 4b. The conflicting case: prepare the branch, then merge it

When a PR conflicts with the advanced base, or needs a code fix to keep the tree
green, resolve from the exact pull request head in a dedicated worktree and push
it back to the verified head repository. Never resolve by merging into a local
default branch or by assuming `origin/<headRefName>` identifies the PR head.

```sh
git fetch origin \
  "<default-branch>:refs/remotes/origin/<default-branch>" \
  "pull/<n>/head:refs/codex/pr-<n>"
git worktree add --detach <temp-worktree> refs/codex/pr-<n>
git -C <temp-worktree> merge origin/<default-branch>
# ... resolve conflicts (below), apply any fix needed to keep it building ...
# ... verify: the repo's build + the tests for this PR's blast radius ...
# ... push HEAD to the verified PR head repository and branch ...
gh pr merge <n> <verified-method-flag> --delete-branch --match-head-commit <pushed-sha>
```

Before pushing, compare `headRepository`, `headRepositoryOwner`,
`isCrossRepository`, and `maintainerCanModify` with the remote and branch you
intend to update. For a fork PR, add a remote for that exact fork and push only
when authenticated permission and the user's authorization allow it. Never push
the prepared commit to a same-named branch in the base repository by accident.
If the fork cannot be updated, report the prepared commit or patch and ask the
contributor to apply it.

When Codex materially authors or verifies a conflict fix, add
`Co-authored-by: Codex <noreply@openai.com>` after a blank line in the fix commit
and in the final squash body. Repository squash settings may discard the source
commit message. Omit the trailer for untouched contributor commits and purely
mechanical merges. `git rerere` is worth enabling in the temporary worktree when
the same conflicts recur.

**Resolving Git-level conflicts.** Read each hunk and combine intent rather than
picking a side blindly: prose takes the richer superset, code keeps both sides'
additions (for example two PRs that each add a different new function at the same
anchor: keep both). For a generated or lock file (`Cargo.lock`,
`package-lock.json`, `poetry.lock`), do not hand-merge the hunks: take the base
version and regenerate from the resolved manifest (`cargo build`, `npm install`,
etc.), then confirm consistency (`npm ci` fails loudly if a lockfile and manifest
disagree).

**Resolving semantic conflicts** (the dominant risk, invisible to Git):

- **Shared version or sequence constants.** Two PRs must not both claim the same
  bump. Chain them in merge order: if one already took `3 -> 4` on the base,
  relabel the other to `4 -> 5`. After such a merge, regenerate whatever the change
  feeds (generated code, golden snapshots) and re-run the affected tests, not just
  a final full-suite pass.
- **Migration or numbered-file collisions.** The same numeric prefix on different
  filenames is a clash Git cannot see. Renumber sequentially by merge order.
- **Combined-tree build or test breaks.** Two PRs touching the same module
  (different files) can still fail together. Building and testing that module after
  both land is what catches it.
- **Atomic, mutually-dependent PRs.** Sometimes two PRs only build *together* (a
  library major bump and its call-site fix; two halves of one dependency
  generation). Neither can land as a separately-green commit. Prefer preparing
  the branches so both PRs can merge normally. Folding one PR into another and
  closing it changes the contributor-visible outcome; obtain explicit user
  approval before doing so, then explain the fold on the closed PR and in the
  report.

**Stop on external interference.** If files change underneath you between your own
commands (a stale session or a teammate pushing the same PR branch), halt
immediately, report exactly what you observed, and ask how to proceed. Do not
fight concurrent edits.

## 5. Verify

Run the repo's own checks (find them in its contributor docs or CI config); do not
assume a toolchain. With forge merges, verify the *prepared branch* before you
merge it: that branch already holds base-plus-this-PR, which is exactly the
post-merge tree. Match the gate to the risk:

- **Baseline first.** Run the repo's build and test suite from the fetched default
  branch in a dedicated worktree, so a later failure is attributable to a merge
  rather than a pre-existing break.
- **Before merging a prepared branch (4b):** the repo's build, formatter, and
  linter, plus the tests for that PR's blast radius. Regenerate any generated code
  if the change touched its inputs. This is your real gate, since `--admin` may
  skip CI.
- **For a clean direct merge (4a):** rely on the PR's own required checks, or spot
  check by fetching the advanced base if you bypassed them.
- **After all merges:** fetch the actual merged default branch into the dedicated
  worktree and run the repo's full pre-commit checks and full test suite on it.
  The merged base is the artifact that ships. If the user approved bypassing a
  security or audit check with `--admin`, run its local equivalent here.
- **Integration coverage:** run the full or integration suite, including tests that need
  services or extra setup. Those often skip silently when unconfigured, so a green
  run can be hollow: make sure the relevant ones actually ran.

## 6. Report

Close with a structured summary in this shape:

1. **What was found**: PR count, and whether any files overlapped.
2. **Merge order + rationale**: one line per PR, as a table when there are more
   than two.
3. **Conflicts encountered**: say "None" plainly when true, or describe each
   hand-resolved conflict and why you resolved it that way. Call out any folded or
   closed PR and any `--admin` bypass.
4. **Verification**: what you ran and what passed (name the real suite), including
   the check on the final merged default branch.
5. **Final state**: the default-branch SHA, the remaining open-PR count, and any
   release artifact. State that the count is zero only when every open PR was in
   scope and merged.

## Optional: cut a release

If the request chains a release ("cut a release on the final commit"), use
`$tag-release` after every in-scope PR is merged and CI is green on that exact
commit. Check the real
release mechanism first (a tag-triggered pipeline, a release command, a manual
workflow), do not assume. Match the existing tag and version convention, including
whether tags are signed or lightweight. Then trigger it and watch the release job
to green before calling it done.

## Standing rules

- **Land every in-scope PR through `gh pr merge`.** Never rewrite the local
  default branch and never push commits straight to it. Local git work stays on a
  PR's own branch.
- **Never delete a branch that is another open PR's base.** For a stack, collapse
  top-down into the lowest PR and merge that once, rather than laddering rung by
  rung (see "Stacked PRs").
- Match the repo's merge convention and gate; confirm the method and the ruleset,
  do not assume them.
- Prepare a conflicting PR on its own branch, verify it there, push it, then merge.
- Reserve `--admin` for PRs you hold admin over and have verified locally, and
  obtain explicit user approval for each bypass. Disclose it in the report.
- Go one PR at a time in the chosen order, fetching between merges so each PR
  merges onto the freshly advanced base.
- Halt and ask on any sign of concurrent edits.
- Run `stop-slop` over commit messages and PR or issue text that this workflow
  creates. Use plain ASCII punctuation and no em-dashes.
