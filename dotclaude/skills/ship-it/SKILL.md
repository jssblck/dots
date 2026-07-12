---
name: ship-it
description: 'Use at the end of a workstream to land the change: commit it, open the pull request, and drive CI to fully green. Triggers on "ship it", "commit, PR, get CI green", "open a PR and get it green", "commit and push this and watch CI". Covers local verification, commit and PR conventions, and the fix-until-green CI loop. Invoke with /ship-it.'
user-invocable: true
---

# Ship it: commit, open the PR, get CI green

The finish line of a workstream is not "the code is written", it is **committed,
pushed, PR open, and every CI check green.** Do the whole loop without stopping to
ask "want me to push?": ship it, then report the green PR. The only reason to
pause is a genuine ambiguity or a failure you cannot resolve.

Work on a feature branch, never the default branch (in a worktree if that is the
repo's flow). If you are already on a feature branch, stay on it. Follow the
repo's branch-naming convention.

## 1. Verify locally before you commit

Never push work you have not proven builds and passes. Run the repo's own checks,
cheapest first. Find them in the contributor docs or the CI config; do not assume
a toolchain.

- **Generate first if the repo has a codegen step.** If some code is generated
  (and may be gitignored or must be refreshed after a source edit), run that step
  before building; skipping it produces confusing "undefined symbol" build errors
  that are not real.
- **Mirror what CI runs.** Read the CI config (or the contributor docs) to see the
  real checks, then run them locally so CI is not the first place you see a
  failure: the repo's formatter, its linter, its pre-commit checks, its build, and
  the tests for what you touched.
- **Know your local gaps.** Some checks cannot run on your machine (a tool or
  platform CI has that you do not). Run what you can, note the gap, and let CI
  cover it rather than treating a local-environment limitation as a real failure.
- **Run the full or integration suite when the change reaches it.** Include tests
  that need services or extra setup: those often skip silently when unconfigured,
  so a green run can be hollow. Make sure the relevant ones actually ran. A change
  that does not reach that layer may not need it.
- **Pre-empt the review gate.** If the repo has a code-review gate (an agentic
  reviewer or any required review check), run it locally before you push so its
  findings are not a surprise. If it is slow, run it in the background and push /
  open the PR while it works, then address findings after. Fix a finding at its
  root, never by working around the gate.

When a fix breaks a test, do not just patch the one failure: scan for other call
sites or fixtures that relied on the old behavior, so the next CI run does not
surface a sibling break.

## 2. Run a fresh eyes review

Before committing or creating the PR, start a new sub-agent to conduct an
adversarial **fresh eyes** review of the complete change. Give the reviewer the
diff, the relevant source and tests, and the intended outcome, but do not pass
along the implementation discussion or your conclusions. Ask it to look for
correctness bugs, missed edge cases, regressions, unsafe assumptions, and gaps in
tests or documentation.

Evaluate every finding on its merits and fix each actionable issue at its root.
After a fix, run the relevant local checks again and send the revised change
through another fresh eyes review. Continue for as many rounds as needed until
you and the reviewer agree that no actionable findings remain. Do not create the
PR before reaching that state. If sub-agents are unavailable, perform a separate
review pass from the diff and state that limitation in the final report.

## 3. Commit

Group related changes into a logical commit. Write the message as a heredoc so the
body is clean:

```sh
git add <paths>
git commit -m "$(cat <<'EOF'
<Imperative subject line, no trailing period>

<Body: explain WHY the change is needed and what it does, not a restatement of
the diff. Wrap at ~80 columns.>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Rules that always hold:

- Imperative subject ("Fix the stale cache read...", "Reject empty payloads...").
- The body carries the reasoning. Bump any shared version or sequence constants
  the change requires and say so.
- Keep your standard `Co-Authored-By` trailer.
- **No em-dashes** anywhere in the message. Run the `stop-slop` skill over the
  message (and the PR body) before finalizing.

## 4. Open the PR

Push the branch, then create the PR with a structured body:

```sh
gh pr create --base <default-branch> --head <branch> \
  --title "<same imperative style as the commit subject>" \
  --body "$(cat <<'EOF'
## Problem

Fixes #<issue>.

<What is wrong today and why it matters.>

## Fix

<What the change does, as a short bulleted list.>

## Tests

<The tests added or updated, and what each pins.>

<your standard generated-by trailer>
EOF
)"
```

Notes:

- Reference the issue with `Fixes #<n>` (or `Closes #<n>`) when the work started
  from one; many workstreams open with "plan and implement a fix for issue N".
- The exact section headings flex to fit the change: `Problem`, then a
  what-changed section (`Fix`, `Change`, or `Approach` + `Changes`), then a
  `Tests` or `Verification` section, and optionally `Acceptance` or `Scope`. What
  is constant: a problem statement, what changed, how it was checked, the
  `Fixes #<n>` line, and your generated-by trailer. A short fenced code block for a
  key type or signature is welcome when it clarifies the change.
- Base the default branch. These are normal (not draft) PRs, with no labels or
  reviewers unless asked.

## 5. Get CI green

CI is not green until **every** check passes: the build (across whatever matrix it
runs), the test job, the formatter and linter checks, and any review gate.

Prefer `gh pr checks <n> --watch --interval 20` (it blocks until the run resolves)
or run that watch in the background and act on its completion notification. This
harness blocks a `sleep N && <cmd>` chain, so do not string sleeps together to
wait; use the watch or a real background wait. Filter to the jobs you care about
with `| grep -iE "test|review|fail"`, and give multi-minute jobs time. When a
check fails, diagnose from the log rather than guessing:

```sh
gh run view <run-id> --log-failed 2>&1 | grep -iE "FAIL|panic|error|not ok" | head -40
```

Then loop: **diagnose the failure, fix it, re-run the local gates from steps 1
and 2,
commit the fix, push, and re-poll.** A first red run is normal and useful (it
catches hidden dependencies like a fixture that relied on old behavior); keep
going until it is all green. Do not declare done on a partial pass. Fix a
review-gate finding at its root, never by working around the gate.

## 6. Report

Close with the PR link and the concrete green state: which check groups passed,
what shipped as a short list of commits, and any first-run failure you fixed along
the way and why it happened. State plainly that CI is fully green.

## Standing rules

- Feature branch (worktree if that is the repo's flow), never the default branch.
- Verify locally before pushing; the full or integration suite is the
  authoritative check.
- Complete an adversarial fresh eyes review in a new sub-agent before creating
  the PR. Fix actionable findings and repeat until both agents are satisfied.
- Imperative commit subject, why-focused body, `Co-Authored-By` trailer, no
  em-dashes, `stop-slop` over all prose.
- PR body leads with the problem, states what changed and how it was checked,
  references the issue (`Fixes #<n>`), and ends with your generated-by trailer;
  the exact section headings flex.
- Loop until every CI check is green; diagnose failures from the logs, do not
  guess; fix review findings at the root.
