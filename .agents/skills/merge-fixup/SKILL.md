---
name: merge-fixup
description: Merge a base branch (e.g. origin/main) into the current feature branch, resolve conflicts, create a fixup branch, push it, open a PR against the feature branch, and comment on the feature branch's PR so the author can decide whether to merge or resolve themselves.
---

# Merge Fixup

Resolve merge conflicts on someone else's feature branch without force-pushing or modifying their branch directly. Instead, create a fixup branch with the merge resolution and offer it to the author via PR comment.

## When to Use

- A feature branch has conflicts with the base branch (usually `main`).
- You want to help resolve the conflicts without pushing directly to the author's branch.
- You want the author to retain control over whether to accept the resolution.

## Workflow

### Arguments

This skill expects the following context (provided by the invoking command or the user):

| Argument | Description | Default |
|----------|-------------|---------|
| Feature branch | The branch with conflicts | Current branch |
| Base branch | The branch to merge in | `origin/main` |
| Your username | GitHub username for the fixup branch name | Infer from `gh api user` or ask |

### Step 1: Fetch and merge

1. Ensure you are on the feature branch.
2. `git fetch origin <base-branch>` to get the latest.
3. `git merge origin/<base-branch>` and let it stop on conflicts.

### Step 2: Resolve conflicts

1. List conflicted files with `git diff --name-only --diff-filter=U`.
2. For each conflicted file:
   - Read the file to understand both sides of the conflict.
   - Check `git log` on both sides for the commits that touched the conflicted region to understand intent.
   - Resolve by choosing the side whose intent should win, or combine if both changes are needed.
   - Prefer the base branch's intent when the feature branch's changes were superseded by a merged PR.
   - Clean up any stray blank lines or formatting artifacts left by the resolution.
3. Stage resolved files with `git add`.
4. Complete the merge with `git commit --no-edit`.

### Step 3: Create fixup branch and PR

1. Create a new branch: `git checkout -b <username>/fixup/<feature-branch>`.
2. Push: `git push -u origin <username>/fixup/<feature-branch>`.
3. Open a PR with `gh pr create`:
   - **Base**: the feature branch (not `main`).
   - **Title**: summarize the merge and conflict resolution.
   - **Body**: explain what was merged, which files had conflicts, and how each was resolved.

### Step 4: Comment on the feature branch's PR

1. Find the feature branch's PR: `gh pr list --head <feature-branch>`.
2. **Draft the comment** and show it to the user for approval before posting. Do NOT post automatically.
3. Once the user approves (or edits), post with `gh pr comment`. The comment should include:
   - A brief explanation of the conflict and resolution.
   - A link to the fixup PR (use `#<number>`).
   - An explicit note that the author can merge or close it and resolve themselves.

### Step 5: Return to the feature branch

1. `git checkout <feature-branch>` so the working tree is back where it started.

## Important Rules

- **Never force-push** to the author's feature branch.
- **Never push directly** to the feature branch -- all changes go through the fixup branch + PR.
- **Always explain the resolution** so the author can review it.
- **Ask the user** if any conflict resolution is ambiguous and you cannot determine intent from git history.
- **Always ask before commenting** on the author's PR. Show the drafted comment text and wait for approval.
