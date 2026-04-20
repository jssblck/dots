---
name: pull-request
description: Open and edit pull requests with why-first descriptions, self-contained context for first-time reviewers, strong testing-steps evidence, and configuration migration guidance.
---

# Pull Request

Create PRs that make the merge intent obvious.

## Core Rule (why first)

When writing the PR title/body, prioritize **why this PR should exist** over a mechanical list of changed files.

- Infer the why from:
  - user conversation and request context
  - issue links and commit messages
  - behavior-level changes visible in the diff
- If the why is unclear, ask the user before drafting the PR body.
- Before posting a PR, propose your inferred why to the user and confirm it.
  - Exception: skip confirmation only if the user explicitly says to proceed without it.

## Self-contained reviewer context (required)

Assume the reviewer has never seen this branch, prior discussion, issue thread, or Slack context.

- The PR description must be understandable on its own, without requiring external links.
- In **Why this change**, include enough context to explain:
  1. current behavior or problem
  2. desired behavior or outcome
  3. why this approach was chosen
  4. who or what is affected
- Expand internal acronyms and project-specific terms on first use.
- If you link issues or docs, summarize the key facts inline instead of saying "see issue".
- Avoid context-dependent phrases like "as discussed", "same as before", or "this fixes it" without naming what "it" is.

## What to include vs. omit

- Default body should include:
  1. **Why this change** (self-contained context + intent)
  2. **Testing steps performed**
- If the PR changes setup or runtime config, also include:
  3. **Configuration changes after merge**
- Omit detailed "what changed" bullets by default.
- Include a change summary only when it is surprising, risky, or explicitly requested.

## Testing steps performed guidance (required)

A good testing-steps section consists of one or more of the following:

1. Verbatim commands and their verbatim output demonstrating the change has the desired effect.
   - Intention: allow reviewers to follow along locally and validate behavior.
2. A script or executable that reviewers can run to demonstrate the change has the desired effect.
3. Screenshots or video showcasing the change has the desired effect.
   - Most useful (and usually preferred) for frontend-impacting changes.

Guidelines:
- Attempt to gather test evidence yourself before asking the user.
- If it is unclear how to validate, or you are blocked from collecting evidence, ask the user for guidance or ask them to provide the evidence directly (command output, runnable script, screenshots/video) for inclusion.
- Prefer reproducible local validation steps.
- Include exact commands and verbatim output, not summaries, when command-based validation is used.
- Include enough output to prove the key behavior changed as intended.
- If using a script/executable, include exact invocation, required inputs, and prerequisites.
- If using screenshots/video, include short captions explaining expected result.
- If validation was not run, say so explicitly, explain why, and note what help is needed.


## Configuration changes (required when applicable)

Include a dedicated section when the PR changes developer or runtime setup, for example:
- added/removed/renamed `.env` variables
- auth or credential source changes
- Docker/compose/bootstrap prerequisites
- required rebuild or migration commands
- changed local dev workflow entrypoints

Use a step-by-step format similar to:
1. Pull/install updates
2. Remove old config
3. Add new config
4. Rebuild/restart services
5. Verify expected success signals

Guidelines:
- Use concrete commands and exact variable names.
- State where new secrets/values come from (for example, 1Password item or dashboard URL).
- Explicitly call out what is no longer needed and can be removed/revoked.
- If no config changes are needed, omit this section.

## PR Body Template

Use this structure by default:

1. **Why this change**
   - 2-5 bullets on current behavior/problem, goal, intended outcome, and impact.
2. **Configuration changes after merge** (when applicable)
   - Step-by-step migration/update instructions.
3. **Testing steps performed**
   - One or more: verbatim commands + output, runnable script/executable, screenshots/video.
4. **Surprising changes / Notes** (optional)
   - Only non-obvious deltas, migration concerns, or merge risk.

## Pre-Create Confirmation

Before `gh pr create`:

1. Draft the why statement from available context.
2. Share it with the user for confirmation or correction.
3. Confirm whether a **Configuration changes after merge** section is needed.
4. Attempt to gather testing-steps evidence directly (run commands, run scripts, capture artifacts).
5. If evidence collection is unclear or blocked, ask the user for guidance or for evidence to include directly.
6. Confirm final testing-steps evidence format (commands/output, script, screenshots/video).
7. Update the PR body with confirmed framing and evidence.
8. Self-contained check: verify a reviewer with zero prior context can understand why, impact, and validation from the PR body alone.
9. Create the PR.

If the user already gave explicit why language, reuse it and do a brief confirmation.

## Safe Body File Creation

When creating a temporary file for PR bodies (for example, before `gh pr create --body-file` or `gh pr edit --body-file`):

- Use file-creation tools (for example, `write`, or equivalent direct file tools) to create/populate the file.
- Do **not** use shell redirection/heredocs (for example, `cat <<EOF > file`, `echo ... > file`, or inline multi-line shell strings).
- This avoids shell interpolation surprises and accidental command/env expansion in PR content.

## Editing Existing PRs

If asked to revise a PR description:

- Add or strengthen the **Why this change** section first.
- Rewrite ambiguous or context-dependent references so the description stands on its own.

- Add/update **Configuration changes after merge** when setup changed.
- Add/update **Testing steps performed** so it includes one or more approved evidence forms.
- If evidence is missing or blocked, ask the user for guidance or direct evidence artifacts to include.
- Remove mechanical summaries unless they are surprising/risky.
- Keep the body concise while preserving reviewer-verifiable evidence.
- Confirm rewritten why framing with the user when feasible.
