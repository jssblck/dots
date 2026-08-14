---
name: merge-open-prs
description: Snapshot the current open pull requests, assemble that frozen set into one native GitHub stack, resolve textual and semantic conflicts, and merge the whole stack in one gh stack merge. Ignore PRs opened after the snapshot. Rebase if the default branch moves under the stack. Use when the user says "merge all open PRs", asks the agent to land the open PRs as a stack, requests conflict resolution across PRs, or chains those merges into a release.
user-invocable: true
---

# Merge the open PRs as one stack

Snapshot the open PRs. That list is the work set. Assemble those PRs into one
native GitHub stack, resolve textual and semantic conflicts until the top
branch is the intended post-merge tree, then merge the entire stack with one
`gh stack merge`.

PRs opened after the snapshot are out of scope. A default-branch advance under
the stack is in scope: sync, resolve, and re-verify before merging.

Every work-set PR lands through the forge. Do not merge into a local default
branch and push that. Do not push commits straight to the default branch. Local
git work happens only on the PRs' own branches, in a dedicated temporary
worktree that you remove afterwards. Preserve the user's active checkout.

**Read the `gh-stack` skill before any `gh stack` command.** Use its
non-interactive flags. This skill covers the merge-all workflow: freezing the
work set, building one stack from existing open PRs, and keeping that stack
current with the default branch.

## 1. Snapshot the work set

```sh
gh api --paginate 'repos/{owner}/{repo}/pulls?state=open&per_page=100' \
  --jq '.[] | {number,title,headRefName:.head.ref,headRefOid:.head.sha,baseRefName:.base.ref,baseRefOid:.base.sha,author:.user.login,isDraft:.draft,updatedAt:.updated_at}'
```

The paginated query must reach every page. If the user named specific PRs,
those numbers are the work set. Otherwise every open PR at this moment is.

Record the PR numbers, head SHAs, and head branches. **That set does not
grow.** A PR that appears on a later `gh pr list` is ignored. After every
`sync`, `submit`, and `view`, compare stack membership to this list. Extra
members are dropped (unstack and rebuild the work set). Never merge them.

Then, for anything but a single obvious PR, build a file-overlap map. For each
work-set PR:

```sh
gh pr view <n> --json title,body,files,headRefName,headRefOid,baseRefName,baseRefOid,headRepository,headRepositoryOwner,isCrossRepository,maintainerCanModify,isDraft,reviewDecision,statusCheckRollup,mergeable,mergeStateStatus,additions,deletions,changedFiles
gh pr diff <n>
```

Record drafts, requested changes, and pending or failing checks. An unready PR
stays in the work set. Make it mergeable (fix it, wait for checks, mark a draft
ready when the request is to merge it). Do not drop it, and do not merge over
unanswered requested changes without user direction.

Also record existing native-stack membership:

```sh
gh api graphql -f owner={owner} -f repo={repo} -f query='
query($owner:String!,$repo:String!){
  repository(owner:$owner,name:$repo){
    pullRequests(states:OPEN, first:100){
      nodes{ number headRefName baseRefName isDraft
        stack{ number size baseRefName entries(first:50){ nodes{ position pullRequest{ number } } } } } } } }'
```

`stack` is `null` on an unstacked PR, including one that is merely chained by
base. Page past `first: 100` the same way. Use this only to decide whether the
planned stack already exists or must be built.

If the work set is empty, stop. If it is one PR, skip to the single-PR merge
in section 7. Two or more PRs become one stack, even when they are
files-disjoint. Do not merge any of them individually with `gh pr merge`.

## 2. Choose the stack order

The overlap map drives the bottom-to-top order. Two files-disjoint PRs cannot
produce a Git-level textual conflict in any order, so ordering is about
semantics and verifiability. Heuristics, in priority order:

- **Small, isolated, disjoint PRs at the bottom.** One-file config tweaks and
  dependency bumps get out of the way. If a PR's changes make the rest easier
  to verify (tooling or test infrastructure), put it at the bottom so every
  layer above it can lean on it.
- **Foundational before dependent.** When PRs overlap or one calls what another
  adds, the dependency sits lower.
- **Shared-state PRs at the top.** A version constant, a migration or sequence
  number, or a checked-in generated artifact compounds with everything below.
  Hold it last and verify it against the fully accumulated tree.
- **When nothing overlaps**, order by blast radius: smallest and most isolated
  at the bottom, largest and riskiest at the top.

An existing base-chain (`baseRefName` of one PR is `headRefName` of another)
is evidence for that order. A user-stated order wins. State the order and a
one-line reason for each layer before you build.

## 3. Know the gate

Learn both once, before you submit or merge.

**The merge method.** Match the repo's history convention.

```sh
gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed
```

Pass that method explicitly on `gh stack merge`. Without a flag, `gh stack`
reuses the last-used method.

**What blocks a merge.** Classic branch protection and rulesets are separate. A
repo can gate purely through a ruleset while the protection endpoint reports
nothing.

```sh
gh api repos/{owner}/{repo}/branches/{branch}/protection   # may 404 even when gated
gh api repos/{owner}/{repo}/rulesets
gh api repos/{owner}/{repo}/rulesets/<id>
```

Look for required status checks, required reviews, and whether the policy is
strict (the branch must contain the default-branch tip). `gh stack merge`
cannot bypass these. Every layer must be genuinely mergeable.

## 4. Assemble one native stack

Setup, then read `gh-stack` for the flags:

```sh
gh extension install github/gh-stack
git config rerere.enabled true
git config remote.pushDefault origin   # required when the repo has several remotes
```

A native stack is possible only when:

- **One repository.** Cross-fork stacks are not supported. A work set that
  contains a fork PR cannot be stacked: use the fallback, or ask to leave the
  fork out.
- **Enabled on the repository.** `submit` and `link` exit **9** where stacked
  PRs are not enabled: use the fallback.
- **Permission to rewrite the branches.** Building a chain from PRs that each
  target the default branch rebases every branch above the bottom, and `submit`
  force-pushes them with `--force-with-lease`. Obtain explicit user approval
  before rewriting a branch you do not own, and disclose every rewrite in the
  report.

Run the rest from a dedicated temporary worktree.

**If GitHub already records exactly the planned stack** (same PR numbers, same
bottom-to-top order): do not rebuild it.

```sh
gh stack checkout <anyWorkSetPR>
gh stack view --json
```

If a different local stack already covers these branches, `gh stack unstack
--local` first, then checkout.

**Otherwise rebuild.** `link` only appends to the top of an existing stack and
never removes a member, so it is the wrong tool for a membership or order
change. Unstack any grouping that covers these branches, then:

```sh
git fetch origin
# init adopts a branch only if it exists locally; a missing one it CREATES from
# the branch below, silently producing an empty layer. Materialize them first:
for b in <bottomBranch> <nextBranch> <topBranch>; do
  git show-ref --verify --quiet "refs/heads/$b" || git branch "$b" "origin/$b"
done
gh stack init --base <default-branch> <bottomBranch> <nextBranch> <topBranch>
gh stack rebase
# exit 3 = conflict: resolve, git add, gh stack rebase --continue (or --abort)
gh stack submit --auto
gh stack view --json   # membership and order must match the work set
```

One exception: the PRs already chain by base in the planned order and `stack`
is null. Then `gh stack link <bottomPR> <nextPR> <topPR>` registers them
without rewriting history.

Confirm `view --json` shows exactly the work-set PRs, bottom to top, before
you continue. `gh pr merge` on any of these members orphans the chain.

## 5. Keep the stack on the current default branch

Record the default-branch tip after every fetch. If that tip moves, the stack
is stale, even when no new PR appeared.

```sh
git fetch origin "<default-branch>:refs/remotes/origin/<default-branch>"
git rev-parse "origin/<default-branch>"
gh stack view --json    # needsRebase, heads, membership
```

When the tip moved, or any layer reports `needsRebase`:

```sh
gh stack sync
```

`sync` fetches, cascade-rebases onto the new trunk, and pushes. On conflict it
restores every branch and exits **3**: run `gh stack rebase`, resolve, continue.
It exits 0 with `Sync aborted` when the local and remote stacks diverged, so
check for that message rather than trusting the exit code. After an abort,
`gh-stack` troubleshooting covers keep-remote vs keep-local. Whichever you
choose, the resulting membership must still equal the work set.

`sync` can also pull down a PR that someone added to the stack on GitHub, or
additively link other open PRs. Compare membership to the work set after every
sync. Drop extras by unstacking and rebuilding the work set. Do not merge them.

Re-verify after every successful sync (section 6). Repeat this section
immediately before the merge. A default-branch move between verify and merge
invalidates the verification.

**Stop on other interference.** If a teammate pushes a work-set branch, or
closes a work-set PR without merging it, halt, report what you observed, and
ask. Do not fight concurrent edits to the same branch. If someone else merges
a work-set PR to the default branch, that is a trunk move: sync the remainder
and continue.

## 6. Resolve conflicts and verify

Conflicts show up during `rebase` and `sync`, and as a combined-tree break on
the top branch. Fix a layer's concern on that layer, then `gh stack rebase
--upstack`. Do not dump another layer's fix onto the top branch.

**Textual conflicts.** Read each hunk and combine intent: prose takes the
richer superset, code keeps both sides' additions (two PRs that each add a
function at the same anchor: keep both). For a generated or lock file
(`Cargo.lock`, `package-lock.json`, `poetry.lock`), take the base version and
regenerate from the resolved manifest, then confirm consistency (`npm ci` fails
if a lockfile and manifest disagree).

**Semantic conflicts** (invisible to Git):

- **Shared version or sequence constants.** Two layers must not both claim the
  same bump. Relabel by stack order: if a lower layer took `3 -> 4`, the upper
  one becomes `4 -> 5`. Regenerate whatever the change feeds and re-run the
  affected tests.
- **Migration or numbered-file collisions.** The same numeric prefix on
  different filenames is a clash Git cannot see. Renumber by stack order.
- **Combined-tree build or test breaks.** Two layers that touch the same
  module in different files can still fail together. The top branch is where
  you catch that.
- **Mutually dependent PRs.** A library bump and its call-site fix only build
  together. Stacking them is the fix: the atomic merge never exposes the
  broken intermediate state. Folding one PR into another and closing it
  changes the contributor-visible outcome; obtain approval before doing that.

Before pushing a conflict fix, confirm `headRepository`,
`headRepositoryOwner`, `isCrossRepository`, and `maintainerCanModify` match
the remote you will update. For a fork, add a remote for that exact fork. Never
push a prepared commit to a same-named branch in the base repository by
accident.

Apply any attribution rule from the active global instructions when you
materially author a conflict fix. Omit it for untouched contributor commits
and purely mechanical merges.

**Verify** with the repo's own checks (contributor docs or CI config). Do not
assume a toolchain.

- **Baseline.** Run the build and test suite from the fetched default branch in
  a dedicated worktree, so a later failure is attributable to the stack.
- **Top branch.** After the cascade rebase it holds the default branch plus
  every layer, which is the post-merge tree. Run the build, formatter, linter,
  and the tests for the stack's blast radius. Regenerate code if a layer
  touched its inputs.
- **Per-layer checks.** Each PR's required checks still gate `gh stack merge`.
  Let them finish. If the default branch moved while you waited, go back to
  section 5.
- **After the merge.** Fetch the actual default branch and run the full
  pre-commit checks and full test suite on it. Confirm the integration tests
  actually ran; they often skip when unconfigured.

## 7. Merge the stack once

Re-read `gh stack view --json` and the default-branch tip. Membership must
still equal the work set. If the tip moved or any head moved after
verification, sync, resolve, and re-verify first.

```sh
gh stack merge <stack-number> --yes <verified-method-flag>
```

Pass the stack number so every unmerged work-set PR merges. The operation is
all-or-nothing: if any one cannot merge, none do.

- **No bypass.** Stacks cannot skip branch protection or rulesets, and
  `gh stack merge` has no `--admin` equivalent.
- **No `--match-head-commit`.** Confirm each head from `view --json`
  immediately beforehand. A moved head is grounds to re-verify.
- **Drafts block the merge.** `gh pr ready <n>` first, with user direction
  where the draft was deliberate.
- **A merge queue on the base branch queues the stack** instead of merging it.
  The queue picks the method, and the PRs can land in separate groups. Watch
  them land.

Afterwards, `gh stack sync --prune` deletes the local branches for merged PRs.
Remove the temporary worktree.

**Single PR.** Merge it through the forge on its inspected head:

```sh
gh pr view <n> --json headRefOid,baseRefOid
gh pr merge <n> <verified-method-flag> --delete-branch --match-head-commit <verified-sha>
```

If the default branch advanced after preparation, update the PR and re-verify
before merging. `--admin` only with explicit approval for that PR; disclose it.

### Fallback: collapse the chain by hand

Use this only when a native stack is unavailable: exit 9, a fork PR in the
work set, or a rewrite the user declined.

Do not merge the chain bottom-up into the default branch. Merging the bottom
PR with `--delete-branch` removes the branch the next PR is based on, and
GitHub then retargets or closes that child. Under a strict checks policy each
retargeted child also waits through a fresh CI cycle.

Collapse top-down into the lowest work-set PR, then merge that one PR into the
default branch. Check protection on every parent branch; internal chain
branches may also be gated.

```sh
# chain: main <- A <- B <- C   (A bottom, C top)
gh pr merge C <verified-method-flag> --match-head-commit <verified-C-sha>
gh pr merge B <verified-method-flag> --match-head-commit <verified-B-sha>
gh pr merge A <verified-method-flag> --delete-branch --match-head-commit <verified-A-sha>
```

When squash is allowed, give the final squash one combined commit message that
references every folded PR number. Re-read each head and the default-branch
tip immediately before each merge. If the default branch moved, re-prepare the
remaining chain. A post-snapshot PR is still ignored.

If a child was auto-closed after its base disappeared: recreate the base
branch at the parent's old head (`git push origin <sha>:refs/heads/<baseRefName>`),
`gh pr reopen <child>`, retarget with `gh pr edit <child> --base <default>`,
then delete the temporary branch.

## 8. Report

1. **What was found**: work-set PR numbers (the snapshot), any open PRs ignored
   because they appeared later, existing stack membership, and whether files
   overlapped.
2. **Stack + rationale**: stack number, layers bottom to top with a one-line
   reason each, and whether you found the stack or built it. Name any work-set
   PR you did not merge, and why.
3. **Conflicts**: "None" when true, or each hand-resolved conflict and why.
   Call out every rewritten branch, any folded PR, and any `--admin` bypass.
4. **Default-branch moves**: each time the tip changed under the stack, and
   what you did (sync, resolve, re-verify).
5. **Verification**: what you ran and what passed, including the check on the
   final default branch.
6. **Final state**: the default-branch SHA, remaining open PRs (work-set vs
   later arrivals), and any release artifact.

## Optional: cut a release

If the request chains a release, use `$tag-release` after every work-set PR is
merged and CI is green on that exact commit. Check the real release mechanism
first. Match the existing tag and version convention. Trigger it and watch the
release job to green.
