---
name: ship-it
description: Land a completed workstream by verifying it, committing it, opening a ready pull request, and driving every CI check to green. Use when the user says "ship it", "commit and open a PR", "get CI green", "push this and watch CI", or otherwise asks Codex to finish and publish the current change.
---

# Ship it: commit, open the PR, get CI green

Finish with the change committed, pushed, open as a ready pull request, and green
in CI. Invoking `$ship-it` authorizes that complete workflow. Pause only for a
material ambiguity, a required approval, or a failure that cannot be resolved
with the available access.

Work on a feature branch, never the default branch (in a worktree if that is the
repo's flow). If you are already on a feature branch, stay on it. Follow the
repo's branch-naming convention. When the repo has none and a branch is needed,
use the `codex/` prefix.

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

Inspect the complete diff and the working tree before staging. Preserve unrelated
user changes. Group related files into logical commits and stage explicit paths.
Write each message with a clean body:

```sh
git add <paths>
git commit -m "$(cat <<'EOF'
<Imperative subject line, no trailing period>

<Body: explain WHY the change is needed and what it does, not a restatement of
the diff. Wrap at ~80 columns.>

Co-authored-by: Codex <noreply@openai.com>
EOF
)"
```

Rules that always hold:

- Imperative subject ("Fix the stale cache read...", "Reject empty payloads...").
- The body carries the reasoning. Bump any shared version or sequence constants
  the change requires and say so.
- Add `Co-authored-by: Codex <noreply@openai.com>` when Codex materially authored,
  rewrote, debugged, or verified the change. Omit it for inspection-only or purely
  mechanical commits. Never add a human co-author unless the user asks.
- **No em-dashes** anywhere in the message. Run the `stop-slop` skill over the
  message (and the PR body) before finalizing.

## 4. Open the PR

Infer the PR's core reason from the workstream and confirm it with the user unless
the reason was already confirmed or the user explicitly asked Codex to proceed
without confirmation. Then push the branch and inspect whether it already has an
open PR:

```sh
gh pr list --state open --head <branch> --json number,title,url,isDraft,baseRefName,headRefName
```

Reuse the existing PR when present. Update its title and body, correct its base if
needed, and mark it ready with `gh pr ready <n>` when it is a draft. Otherwise,
create a ready PR with a self-contained body:

```sh
gh pr create --base <default-branch> --head <branch> \
  --title "<same imperative style as the commit subject>" \
  --body "$(cat <<'EOF'
## Why this change

Fixes #<issue>.

<What is wrong today and why it matters.>

## What changed

<What the change does, as a short bulleted list.>

## Testing

<Exact commands run and their results. If a check was not run, say why.>

Co-authored-by: Codex <noreply@openai.com>
EOF
)"
```

Notes:

- Reference the issue with `Fixes #<n>` (or `Closes #<n>`) when the work started
  from one; many workstreams open with "plan and implement a fix for issue N".
- Flex headings to fit the change while keeping the reason, implementation, and
  concrete verification easy to find. Include configuration instructions only
  when setup or runtime configuration changed. A short fenced code block for a
  key type or signature is useful when it clarifies the change.
- Add the Codex attribution footer only when Codex materially contributed to the
  implementation or verification.
- Base the default branch. Create a normal ready PR, with no labels or reviewers
  unless asked. Do not add a Codex-specific title prefix.
- Before watching CI, verify the final PR's base, head, readiness, title, body,
  and URL with `gh pr view`.

## 5. Get CI green

CI is not green until **every** check passes: the build (across whatever matrix it
runs), the test job, the formatter and linter checks, and any review gate.

Prefer `gh pr checks <n> --watch --interval 20` (it blocks until the run resolves)
or run that watch in the background and act on its completion notification. This
harness blocks a `sleep N && <cmd>` chain, so do not string sleeps together to
wait; use the watch or a real background wait. Watch the complete check set so a
filtered view cannot hide a failure. When a check fails, start with the complete
failed-job log, then search within it as needed:

```sh
gh run view <run-id> --log-failed
```

Then loop: **diagnose the failure, fix it, re-run the local gates from steps 1
and 2,
commit the fix, push, and re-poll.** A first red run is normal and useful (it
catches hidden dependencies like a fixture that relied on old behavior); keep
going until it is all green. Do not declare done on a partial pass. Fix a
review-gate finding at its root, never by working around the gate.

## 6. Report

Close with the PR link and the concrete green state: which check groups passed,
what shipped as a short list of commits, and any first-run failure fixed along
the way. State plainly that CI is fully green. When the Codex app supports Git
action directives, emit the applicable branch, stage, commit, push, and PR
directives only after each action has succeeded.

## Standing rules

- Feature branch (worktree if that is the repo's flow), never the default branch.
- Verify locally before pushing. Run the full or integration suite when the
  change reaches that layer and the required environment is available. The
  complete CI result is the final authority for the PR.
- Complete an adversarial fresh eyes review in a new sub-agent before creating
  the PR. Fix actionable findings and repeat until both agents are satisfied.
- Imperative commit subject, why-focused body, conditional Codex co-author
  trailer, no em-dashes, and `stop-slop` over durable prose.
- PR body leads with the problem, states what changed and how it was checked,
  references the issue (`Fixes #<n>`), includes configuration steps when needed,
  and ends with the Codex footer when applicable.
- Loop until every CI check is green; diagnose failures from the logs, do not
  guess; fix review findings at the root.
