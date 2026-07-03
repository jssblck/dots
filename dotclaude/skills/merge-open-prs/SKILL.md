---
name: merge-open-prs
description: Use when asked to merge all (or several) open pull requests at once: "merge all open PRs", "identify the open PRs and merge them in the best order", "merge these PRs resolving conflicts". Covers enumerating the open PRs, choosing a merge order that minimizes conflicts, resolving Git-level and semantic conflicts, verifying between merges, and reporting the result. Optionally chains a release. Invoke with /merge-open-prs.
user-invocable: true
---

# Merge all open PRs

The task, in one line: **identify every open PR, pick the order that minimizes
conflicts, then merge them all, resolving both Git-level (textual) and semantic
(build/test/behavioral) conflicts, verifying as you go.** This runs on the
default branch, never on a feature branch. The request sometimes appends "then
cut a release"; if it does, see the last section.

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
`headRefName` (to find a local branch or worktree if you need to resolve
conflicts there).

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

## 3. Merge, resolving conflicts

**Pick the mechanism the repo uses.** Check the allowed methods and match the
existing history convention (squash vs merge commit vs rebase); do not assume:

```sh
gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed
```

If, say, the repo is squash-only and its history is one squashed commit per PR,
merge each PR that way. There are two ways to run the merges, and which you use
decides whether you ask before pushing:

- **Direct forge merge (default for clean, disjoint PRs).** Merge each PR
  server-side in the chosen order:

  ```sh
  gh pr merge <n> --squash --delete-branch   # use the repo's allowed method
  ```

  Add `--auto` to let it wait for required checks when a branch was just updated,
  and `--admin` to bypass "branch must be up to date" or required-review
  protection when you hold admin and the PR is low-risk and already verified.
  After the base advances, the next PR stays mergeable as long as its files are
  disjoint; if a branch is behind and protection requires it current,
  `gh pr update-branch <n>` first.

- **Local dry-run first (when you want to prove the integrated tree before it
  touches the remote).** Back up the default branch, merge each branch locally,
  verify after each:

  ```sh
  git branch -f backup/pre-merge <default-branch>
  git merge --no-ff origin/<headRefName> -m "Merge PR #<n>: <title>"
  ```

  Once the whole set builds and passes locally, **stop and ask how to land it**
  (this is an outward, hard-to-reverse step with more than one valid answer: push
  the merge commits, redo each through the forge in the repo's convention, or
  hold). If the answer is the forge path, discard the local merge commits and let
  the forge redo them:

  ```sh
  git reset --hard origin/<default-branch>
  gh pr merge <n> --squash   # each PR, in the same verified order
  ```

  Delete the backup branch once the remote is verified.

**Resolving Git-level conflicts.** When `git merge` reports a conflict, resolve it
in the PR's own worktree if one exists (not the main checkout). Read each hunk and
combine intent rather than picking a side blindly: prose takes the richer
superset, code keeps both sides' additions (for example an insert that needs a
field each side added). Verify, commit, push, then merge.

**Resolving semantic conflicts** (the dominant risk, invisible to Git):

- **Shared version or sequence constants.** Two PRs must not both claim the same
  bump. Chain them in merge order: if one already took `3 -> 4` on the base,
  relabel the other to `4 -> 5`. After any such merge, regenerate whatever the
  change feeds (generated code, golden snapshots) and re-run the affected tests,
  not just a final full-suite pass.
- **Migration or numbered-file collisions.** The same numeric prefix on different
  filenames is a clash Git cannot see. Renumber sequentially by merge order.
- **Combined-tree build or test breaks.** Two PRs touching the same module
  (different files) can still fail together. Building and testing that module
  after both land is what catches it.

**Stop on external interference.** If files change underneath you between your own
commands (a stale session or a teammate rebasing the same worktree), halt
immediately, report exactly what you observed, and ask how to proceed. Do not
fight concurrent edits.

## 4. Verify

Run the repo's own checks (find them in its contributor docs or CI config); do not
assume a toolchain. Match the gate to the risk:

- **Baseline before touching anything** (local dry-run path): the repo's build and
  test suite on a clean default branch, so a later failure is attributable to a
  merge, not a pre-existing break.
- **After each merge**: the repo's build, formatter, and linter, plus the tests
  for that PR's blast radius. Regenerate any generated code if the change touched
  its inputs.
- **After all merges**: the repo's full pre-commit checks and full test suite.
- **Gold standard**: the full or integration suite, including tests that need
  services or extra setup. Those often skip silently when unconfigured, so a green
  run can be hollow: make sure the relevant ones actually ran.
- If you merged through the forge, **re-verify the actual merged default branch**
  afterward rather than trusting the local dry-run stood in for it.

## 5. Report

Close with a structured summary in this shape:

1. **What was found**: PR count, and whether any files overlapped.
2. **Merge order + rationale**: one line per PR, as a table when there are more
   than two.
3. **Conflicts encountered**: say "None" plainly when true, or describe each
   hand-resolved conflict and why you resolved it that way.
4. **Verification**: what you ran and what passed (name the real suite).
5. **Final state**: the default-branch SHA, that the open-PR count is now zero,
   and any release artifact.

## Optional: cut a release

If the request chains a release ("cut a release on the final commit"), do it only
after every PR is merged and CI is green on that exact commit. Check the real
release mechanism first (a tag-triggered pipeline, a release command, a manual
workflow), do not assume. Match the existing tag and version convention, including
whether tags are signed or lightweight. Then trigger it and watch the release
job to green before calling it done.

## Standing rules

- Match the repo's merge convention; confirm the method, do not assume it.
- Confirm before pushing when you have made local merge commits (more than one
  valid way to land, and pushing is hard to reverse). Direct forge merges need no
  such question.
- Keep a backup branch whenever you rewrite the local default branch; delete it
  once verified.
- Halt and ask on any sign of concurrent edits.
- No em-dashes in any commit message, PR text, or summary.
