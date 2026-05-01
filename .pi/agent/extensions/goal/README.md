# Pi judged /goal extension

Adds a user-level `/goal` command for persistent, judged goal pursuit.

## Commands

- `/goal <objective>`: start or replace a goal.
- `/goal status`: show current state.
- `/goal verify <command>`: require a verifier command to pass before completion.
- `/goal judge`: run the independent judge on current state.
- `/goal pause`: pause continuation.
- `/goal resume`: resume continuation.
- `/goal stop` or `/goal clear`: clear state.

## Worker tools

The extension registers these tools for the main agent:

- `goal_progress`: record progress without requesting completion.
- `goal_complete_request`: request completion. This runs the verifier and an independent judge; the worker cannot mark the goal complete by itself.
- `goal_blocked`: pause when user input is required.

## Completion policy

A goal is complete only when `goal_complete_request` receives a `pass` verdict from the judge. If a verifier command is configured and exits non-zero, the extension overrides any judge pass to fail.

State is stored as custom session entries, so it follows the current session branch and survives reloads/resumes.
