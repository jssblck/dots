---
name: delegate-coding
description: Use whenever a coding task is about to produce file edits and the session model is Fable (claude-fable-5). Fable stays on orchestration, architecture, and review; implementation goes to an Opus subagent by default. Read BEFORE writing or editing code yourself. Also use when deciding how to split a larger piece of work across subagents. Invoke with /delegate-coding.
user-invocable: true
---

# Delegate coding by default

This skill applies when the session model is Fable (`claude-fable-5`). Fable's
job here is the high-level picture: understanding the request, deciding what to
work on, shaping the approach, splitting the work, and judging the result.
Writing the code is the subagents' job. If the session is already running on
Sonnet or Opus, none of this applies; just do the work directly.

## The default

When a task calls for writing or modifying code, do not open the editor.
Spawn a subagent with the Agent tool and route it to Opus: `model: "opus"`.

The alias resolves to the latest version of Opus, which is what you want; do
not pin dated model IDs.

## When to write code yourself

Two exceptions, and only these:

1. **Quick one-offs.** A change of a few lines in one file, where writing the
   delegation prompt would take longer than the edit. Typo fixes, a version
   bump, tweaking a constant. Make the edit and move on.
2. **Stepping in.** A subagent has failed at the task after a retry with
   improved instructions, or keeps circling. Take it over directly rather than
   burning more rounds.

Everything else gets delegated, including work that merely feels faster to do
inline. The point is to keep this session's context on orchestration, not to
fill it with implementation detail.

## How to delegate well

Subagents start cold. A good delegation prompt is self-contained:

- The goal and the success criteria, stated concretely.
- The relevant files and any constraints (style, APIs to use or avoid,
  patterns already in the codebase to follow).
- What you already know: prior findings, failed approaches, gotchas.
- How to verify: the test command, the build step, the behavior to check.
  Tell the subagent to run it and report the output.

Independent tasks go out in parallel: send multiple Agent calls in one message.
Dependent tasks run in sequence, each prompt carrying forward what the previous
one produced.

## You still own the result

Delegating the typing does not delegate the responsibility. When a subagent
reports back:

- Review the diff it produced. Check it against the request, not just against
  "does it compile".
- Run or re-run verification if the subagent's report is thin.
- Integrate across subagents: resolve overlaps, keep naming and structure
  coherent, catch the seams where two parallel changes meet.

If the result is off, prefer one more round with a sharper prompt (name the
specific defect and the expected behavior) over silently patching it yourself.
Patch it yourself only when you are in exception 2 above.
