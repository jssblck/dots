---
name: merge-open-prs
description: Use when asked to merge all (or several) open pull requests at once: "merge all open PRs", "identify the open PRs and merge them in the best order", "merge these PRs resolving conflicts". Covers enumerating the open PRs, choosing a merge order that minimizes conflicts, resolving Git-level and semantic conflicts, verifying between merges, and reporting the result. Optionally chains a release.
user-invocable: true
---

# Merge all open PRs

The task, in one line: **identify every open PR, pick the order that minimizes
conflicts, then merge them all through GitHub in that order, resolving both
Git-level (textual) and semantic (build/test/behavioral) conflicts, verifying as
you go.**

**Every PR lands through the forge (`gh pr merge`), never by rewriting the local
default branch.** The whole point is that each PR ends up properly Merged on
GitHub, in the order you chose, closing on its own head commit. So do not merge
branches into a local `main` and push that, and do not push commits straight to
the default branch. Local git work happens only on a *PR's own branch*, to
prepare it for a clean server-side merge. This runs against the default branch as
the base; the request sometimes appends "then cut a release", in which case see
the last section.

Work the whole thing to a finished, verified state. Do not merge blind off the
PR list, and do not stop at "they probably do not conflict": prove it.

## 1. Enumerate the open PRs

```sh
gh pr list --state open --json number,title,headRefName,baseRefName,author,updatedAt,mergeable,additions,deletions,changedFiles --limit 100
```

Then, for anything but the most trivial case, build a real file-overlap map
before deciding order. For each PR:

```sh
gh pr view <n> --json title,body,files
gh pr diff <n>
```

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

Do NOT merge a stack bottom-up, rung by rung, into the default branch. It looks
right and is a trap:

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
(never the default branch, so the default-branch ruleset never gates these
internal merges and nothing is orphaned):

```sh
# stack: main <- A <- B <- C   (A bottom, C top); use the repo's allowed method
gh pr merge C --squash        # C into B's branch; closes C
gh pr merge B --squash        # B (now carrying C) into A's branch; closes B
# A's branch now holds A+B+C, and CI already ran green over that exact tree
gh pr merge A --squash --delete-branch   # the ONE merge into main, combined message
```

Give that final squash one combined commit message referencing every folded PR
number, e.g. `... (#A, #B, #C)`. Because the top branch already contained the
whole stack and already ran CI green over the combined tree, the final merge is
pre-verified and conflict-free. (A fast-forward push, `git push origin
<childTip>:refs/heads/<parentBranch>`, collapses a rung without an extra commit
when you would rather not route it through `gh pr merge`.)

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

### 4a. The clean case

A PR whose files do not collide with anything already landed merges directly:

```sh
gh pr merge <n> --squash --delete-branch     # use the repo's allowed method
```

- Add `--auto` to let GitHub land it once required checks pass (good when the
  PR's own CI is trustworthy and you would rather wait than bypass).
- Add `--admin` to merge now, bypassing required checks or a stale-branch
  requirement, **when you hold admin, have verified the result yourself, and the
  PR is low risk.** `--admin` skips the very checks that would have caught a
  problem, so it is only sound when your own local verification (section 5) is
  stronger than those checks. When you use it, say so in the report.
- If a ruleset is strict and a branch is behind, `gh pr update-branch <n>` brings
  it current first (or prepare the branch as in 4b).

Right after a push or a base advance, `mergeable`/`mergeStateStatus` can read
`UNKNOWN` or a stale `CONFLICTING` while GitHub recomputes. Wait a few seconds and
re-read `gh pr view <n> --json mergeable,mergeStateStatus` before concluding a PR
truly conflicts.

### 4b. The conflicting case: prepare the branch, then merge it

When a PR conflicts with the advanced base, or needs a code fix to keep the tree
green, resolve on **the PR's own branch** and push it back, so the server-side
merge is clean. Never resolve by merging into a local default branch.

```sh
git fetch origin
git checkout -B _land<n> origin/<headRefName>
git merge origin/<default-branch>            # bring the advanced base into the PR branch
# ... resolve conflicts (below), apply any fix needed to keep it building ...
# ... verify: the repo's build + the tests for this PR's blast radius ...
git push origin HEAD:<headRefName>           # update the PR branch in place
gh pr merge <n> --squash --delete-branch     # then land it through the forge
```

Pushing to a contributor's PR branch (including a bot's, like Dependabot) is part
of the mechanism and needs no permission; you are updating the PR, not the
protected base. `git rerere` is worth enabling early (`git config rerere.enabled
true`): once you resolve a recurring conflict (a shared lockfile, a shared doc
paragraph) it replays the resolution on the next branch automatically.

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
  generation). Neither can land as a separately-green commit. Fold them: prepare
  one branch that carries both changes plus the fix, land that PR, then close the
  other with a comment explaining it was folded in and that its content is on the
  base. Say so in the report, and note it is the user's call whether they would
  rather see both as distinct merges.

**Stop on external interference.** If files change underneath you between your own
commands (a stale session or a teammate pushing the same PR branch), halt
immediately, report exactly what you observed, and ask how to proceed. Do not
fight concurrent edits.

## 5. Verify

Run the repo's own checks (find them in its contributor docs or CI config); do not
assume a toolchain. With forge merges, verify the *prepared branch* before you
merge it: that branch already holds base-plus-this-PR, which is exactly the
post-merge tree. Match the gate to the risk:

- **Baseline first.** Run the repo's build and test suite on a clean default
  branch, so a later failure is attributable to a merge, not a pre-existing break.
- **Before merging a prepared branch (4b):** the repo's build, formatter, and
  linter, plus the tests for that PR's blast radius. Regenerate any generated code
  if the change touched its inputs. This is your real gate, since `--admin` may
  skip CI.
- **For a clean direct merge (4a):** rely on the PR's own required checks, or spot
  check by fetching the advanced base if you bypassed them.
- **After all merges:** fetch and check out the actual merged default branch and
  run the repo's full pre-commit checks and full test suite on it. Do not trust
  that the sum of per-PR checks stood in for the whole; the merged base is the
  artifact that ships. If you bypassed a security or audit check with `--admin`
  (dependency audit, secret scan), run its local equivalent here.
- **Gold standard:** the full or integration suite, including tests that need
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
5. **Final state**: the default-branch SHA, that the open-PR count is now zero, and
   any release artifact.

## Optional: cut a release

If the request chains a release ("cut a release on the final commit"), do it only
after every PR is merged and CI is green on that exact commit. Check the real
release mechanism first (a tag-triggered pipeline, a release command, a manual
workflow), do not assume. Match the existing tag and version convention, including
whether tags are signed or lightweight. Then trigger it and watch the release job
to green before calling it done.
