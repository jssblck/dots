---
name: merge-open-prs
description: Use when asked to merge all (or several) open pull requests at once: "merge all open PRs", "identify the open PRs and merge them in the best order", "merge these PRs resolving conflicts". Covers enumerating the open PRs, detecting the ones GitHub already records as a stack, splitting the rest into independent PRs and sequenced groups, merging the independent ones in a conflict-minimizing order, assembling each sequenced group into a native GitHub stack and merging it atomically, resolving Git-level and semantic conflicts, verifying between merges, and reporting the result. Optionally chains a release.
user-invocable: true
---

# Merge all open PRs

The task, in one line: **identify every open PR, separate the independent ones
from the groups that must land in sequence, merge the independent ones through
GitHub in the order that minimizes conflicts, land each sequenced group as one
native stack, resolving both Git-level (textual) and semantic
(build/test/behavioral) conflicts and verifying as you go.**

**Every PR lands through the forge (`gh pr merge`, or `gh stack merge` for a
stack), never by rewriting the local default branch.** The whole point is that
each PR ends up properly Merged on GitHub, in the order you chose, closing on its
own head commit. So do not merge
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

Then find the PRs that GitHub already records as a native stack. Settle this
before you plan any merge: a stack member merged with `gh pr merge` breaks the
chain, and a stack that already exists must never be rebuilt. The field is
read-only and costs one query:

```sh
gh api graphql -f owner={owner} -f repo={repo} -f query='
query($owner:String!,$repo:String!){
  repository(owner:$owner,name:$repo){
    pullRequests(states:OPEN, first:100){
      nodes{ number headRefName baseRefName isDraft
        stack{ number size baseRefName entries(first:50){ nodes{ position pullRequest{ number } } } } } } } }'
```

`stack` is `null` on an unstacked PR, including one that is merely chained by
base. A non-null `stack` gives the stack number, its size, and every member with
its position, so you learn the full membership even when only part of it is in
scope.

Then split the rest of the list in two, because the halves land by different
mechanisms:

- **Independent PRs** can land in any order without breaking each other. Merge
  each one as-is, per section 4.
- **Sequenced PRs** are groups where a later PR is broken, wrong, or conflicting
  unless an earlier one lands first. Assemble each group into a native GitHub
  stack and merge that stack in one operation, per "Dependent PRs".

An existing stack is a sequenced group by definition, whatever its contents look
like. Do not second-guess it, and do not split it apart to merge a member on its
own.

Signals that the remaining PRs belong to one sequenced group: a PR whose
`baseRefName` is another PR's `headRefName` (a chain), a semantic dependency (one calls
what the other adds, both bump the same constant, both add a migration), heavy
overlap in the same hunks of the same files, or an order the user stated.

## 2. Choose the merge order

The overlap map drives everything. Two files-disjoint PRs cannot produce a
Git-level textual conflict in any order, so ordering is only about semantics and
verifiability. Order the independent PRs against each other, and order each
sequenced group internally (that ordering becomes the stack, bottom to top).
Heuristics, in priority order:

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

## Dependent PRs: assemble a native stack, then merge it once

GitHub has native stacked pull requests. A *stack* is an ordered chain of PRs
recorded on GitHub: the bottom targets the default branch and each one above
targets the branch below it. `gh stack merge` lands the whole chain in one
atomic, bottom-up operation, so a group that must land in a fixed order becomes a
single merge instead of N laddered ones.

**Read the `gh-stack` skill before running any `gh stack` command.** It is
GitHub's own reference for the non-interactive flags, exit codes, and recovery
paths. This section covers only what that skill does not: merging a stack that
already exists, and turning a group of existing open PRs into one. Setup:

```sh
gh extension install github/gh-stack
git config rerere.enabled true
```

Two things decide whether a stack is possible at all:

- **One repository.** Cross-fork stacks are not supported. A group containing a
  fork PR cannot be stacked: use the fallback below.
- **Enabled on the repo.** Stacked pull requests are in public preview. `submit`
  and `link` exit **9** where the repo does not have them: use the fallback.

A stack that already exists has cleared both.

### When the stack already exists, merge it, do not rebuild it

If section 1 found a non-null `stack`, the work is done: the chain is registered,
the bases are right, and `init`, `link`, and `submit` are all the wrong tool.
Check it is current and merge it:

```sh
gh stack checkout <anyMemberPR>   # pulls the stack down and tracks it locally
gh stack view --json              # needsRebase per branch, PR state per branch
gh stack sync                     # only if a branch reports needsRebase
gh stack merge <targetPR> --yes --squash
```

Three things to settle before merging an existing stack:

- **Scope.** Merging a PR also merges every unmerged PR below it. If a lower
  member is out of scope, not ready, or a draft, you cannot merge above it: stop
  at the highest member whose whole downstack is ready, and say which members you
  left. Never merge a stack member with `gh pr merge` to get around this; that
  orphans the chain.
- **Staleness.** `needsRebase` means the branch no longer contains its parent's
  tip, usually because the default branch moved under it. `gh stack sync` fetches,
  cascade-rebases, and pushes. It restores every branch and exits **3** on
  conflict, and it exits 0 with `Sync aborted` when the local and remote stacks
  diverged, so check for that message rather than trusting the exit code.
- **Members outside your PR list.** A stack can contain PRs you were not asked to
  merge. The membership from section 1 is authoritative; reconcile it with the
  request before acting.

### Build the Git ancestry, then register the stack

For a group that is *not* yet a stack: `link` and `submit` set PR bases and record
the stack on GitHub; neither rewrites history. The branches must already chain,
bottom to top, before you register them.

**When they already chain** (the PRs were opened as a chain but never registered,
so `stack` was null), register and merge:

```sh
gh stack link <bottomPR> <nextPR> <topPR>     # bottom to top; PR numbers, URLs, or branch names
gh stack merge <topPR> --yes --squash         # use the repo's allowed method
```

`link` writes no local tracking state, corrects any wrong base, and only ever
adds PRs to a stack.

**When each PR branches off the default branch** and you are imposing the order,
build the chain yourself. `init` adopts the existing branches, `rebase` cascades
them onto each other, `submit` pushes and retargets the existing PRs:

```sh
git fetch origin
# init adopts a branch only if it exists locally; a missing one it CREATES from
# the branch below, silently producing an empty layer. Materialize them first:
for b in <bottomBranch> <nextBranch> <topBranch>; do
  git show-ref --verify --quiet "refs/heads/$b" || git branch "$b" "origin/$b"
done
gh stack init --base <default-branch> <bottomBranch> <nextBranch> <topBranch>
gh stack rebase          # cascade from the trunk up
# exit 3 = conflict: resolve, git add, gh stack rebase --continue (or --abort)
# ... verify the top branch: it holds base plus the whole stack ...
gh stack submit --auto   # push each branch, retarget each PR's base, record the stack
gh stack view --json     # confirm the chain and the PR numbers
gh stack merge <topPR> --yes --squash
```

The rebase rewrites every branch above the bottom, and `submit` force-pushes them
with `--force-with-lease`, so those PR heads change. That is the mechanism, not an
accident, but report it.

### Merging the stack

`gh stack merge <pr>` merges that PR and every unmerged PR below it, bottom-up
and **all-or-nothing**: if any one cannot merge, none do. Pass a stack number
instead to merge every unmerged PR in the stack.

- **There is no bypass.** Stacks cannot skip branch protection or rulesets, and
  `--admin` does not exist here. Every PR in the set must be genuinely mergeable:
  green required checks, required reviews in place.
- **Drafts block the merge.** `merge` checks each PR is open and not a draft. Run
  `gh pr ready <n>` first.
- **A merge queue overrides everything.** With a queue on the base branch the
  stack is queued rather than merged, the queue picks the method and ignores your
  method flag, and the PRs can land in separate groups. Watch it land instead of
  assuming one atomic merge.
- Pass the method explicitly (`--squash`, `--merge`, `--rebase`, or
  `--merge-method`); without one `gh stack` reuses the last-used method.

Afterwards, `gh stack sync --prune` deletes the local branches for merged PRs.

### Fallback: collapse the chain by hand

Use this only where native stacks are unavailable (exit 9, or a fork PR in the
group). Do not merge a chain rung by rung into the default branch: merging the
bottom with `--delete-branch` removes the branch the next PR is based on, and
GitHub then retargets or *closes* that child; and under a strict
required-status-checks policy every retargeted child needs `update-branch` plus a
fresh CI cycle, so an N-deep chain costs N serial CI waits.

Instead, collapse the chain into its lowest open PR and merge that one PR into
the default branch once. Work top-down, merging each PR into its *parent branch*,
never the default branch:

```sh
# chain: main <- A <- B <- C   (A bottom, C top); use the repo's allowed method
gh pr merge C --squash        # C into B's branch; closes C
gh pr merge B --squash        # B (now carrying C) into A's branch; closes B
# A's branch now holds A+B+C, and CI already ran green over that exact tree
gh pr merge A --squash --delete-branch   # the ONE merge into main, combined message
```

Give that final squash one combined commit message referencing every folded PR
number, e.g. `... (#A, #B, #C)`. A fast-forward push, `git push origin
<childTip>:refs/heads/<parentBranch>`, collapses a rung without an extra commit.

Notes:

- **A partly-merged chain collapses the remainder.** If the bottom PR already
  landed on its own, the next PR up retargets to the default branch; fold the rest
  top-down into it and merge once. The separately-merged bottom does not conflict:
  its squashed content matches the copy already in the stacked branch.
- **One combined commit, not one per PR.** Usually what you want, but it is the
  user's call. If they want distinct merges, ladder them but retarget each child
  to the default branch *before* deleting any base branch, and budget the per-rung
  CI waits.
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

## 4. Merge the independent PRs through GitHub, in order

Go one PR at a time, in the chosen order. Each server-side merge advances the
default branch, so `git fetch` between merges and treat the freshly advanced base
as what the next PR must merge onto. Each sequenced group lands as one stack
instead; slot it into the same order and drive it through the stack section.

No PR that section 1 reported with a non-null `stack` belongs here. `gh pr merge`
on a stack member breaks the chain.

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
  generation). Neither can land as a separately-green commit. Stack them: an
  atomic stack merge lands both together, so no CI run ever sees the broken
  intermediate state, and both PRs stay open and separately reviewable. Where a
  stack is not available, fold them instead: prepare one branch that carries both
  changes plus the fix, land that PR, then close the other with a comment
  explaining it was folded in and that its content is on the base. Say so in the
  report, and note it is the user's call whether they would rather see both as
  distinct merges.

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
- **Before merging a stack:** verify the top branch after the cascade rebase. It
  holds the base plus every layer, which is exactly the post-merge tree, and the
  stack merges all-or-nothing off it.
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

1. **What was found**: PR count, which PRs were independent, which formed a
   sequenced group, which were already a registered stack, and whether any files
   overlapped.
2. **Merge order + rationale**: one line per PR, as a table when there are more
   than two. For a stack, give its number, its layers bottom to top, whether you
   found it or built it, and the fact that it merged atomically. Name any stack
   member you deliberately left unmerged, and why.
3. **Conflicts encountered**: say "None" plainly when true, or describe each
   hand-resolved conflict and why you resolved it that way. Call out any folded or
   closed PR, any `--admin` bypass, and any branch you rewrote to build a stack.
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
