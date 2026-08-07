---
name: hatch-pet
description: Create, repair, validate, preview, and package Codex-compatible animated pets and pet spritesheets from character art, screenshots, generated images, or visual references. Use when a user wants to hatch a Codex pet, create a custom animated pet, or build a built-in pet asset with an 8x9 atlas, transparent unused cells, row-by-row animation prompts, QA contact sheets, preview videos, and pet.json packaging. This skill composes the installed $imagegen system skill for visual generation and uses bundled scripts for deterministic spritesheet assembly.
---

# Hatch Pet

## Overview

Create a Codex-compatible animated pet from a concept, one or more reference images, or both. This skill owns pet-specific prompt planning, animation rows, frame extraction, atlas geometry, QA, previews, and packaging. It delegates visual generation to `$imagegen`.

User-facing inputs are optional. Infer a missing name from the concept or
reference filenames. Choose a short appropriate name if they provide no useful
clue. Infer a missing description from the same sources. For text-only
requests, generate a base pet and use it as the canonical row reference.

## Generation Delegation

Use `$imagegen` for all normal visual generation.

Before generating base art, row strips, or repair rows, load and follow the
installed `$imagegen` skill through the current harness's skill registry. Stop
and tell the user if that skill is unavailable.

Do not call the Image API directly for the normal path. Let `$imagegen` choose its own built-in-first path and its own CLI fallback rules. If `$imagegen` says a fallback requires confirmation, ask the user before continuing.

Pass the generated pet prompt to `$imagegen` as the authoritative visual
specification. Do not wrap it in the generic shared prompt schema. Do not add
hero art, photography, product imagery, illustration styling, or extra polish.
Keep pet prompts terse and sprite-specific. Add only input-image roles and
essential user constraints.

Use this skill's scripts for deterministic work only: preparing prompts and manifests, ingesting selected `$imagegen` outputs, extracting frames, validating rows, composing the final atlas, creating QA media, and packaging.

Do not replace `$imagegen` with code that creates, draws, tiles, warps, mirrors,
or synthesizes pet visuals. This includes Python, Pillow, SVG, canvas, and
HTML/CSS.

A normal run can require 10 visual jobs: one base image and nine row strips.
You may mirror `running-right` to create `running-left` only after visual
inspection confirms that mirroring is safe. Otherwise, generate `running-left`
as a grounded `$imagegen` row. If generation is blocked or too expensive, stop
and explain the blocker. Never fabricate the missing rows locally.

Do not mark jobs complete by editing `imagegen-jobs.json`, copying files into
`decoded/`, or writing output-population scripts. Record selected built-in
outputs with `record_imagegen_result.py`. Use `generate_pet_images.py` only for
the documented secondary fallback. Deterministic scripts may process only
visuals that `$imagegen` already generated.

Only the base job may omit reference images. Attach every input listed in
`imagegen-jobs.json` to each row job. This includes the canonical base created
after recording the base job. Reject any row generated without its grounding
images.

## Codex Digital Pet Style

Match the Codex app's built-in pets by default. Use small pixel-adjacent mascots
with compact chibi proportions and readable silhouettes. Use dark 1-2 px
outlines, stepped edges, limited palettes, flat cel shading, expressive faces,
and small limbs. Simplify detailed or realistic references to this style.

Do not generate polished illustrations, painterly rendering, anime key art, 3D
rendering, or glossy app icons. Avoid realistic textures, soft gradients,
high-detail antialiasing, and complex small accessories. Simplify detailed
references before generating rows.

## Transparency And Effects

Pet rows are processed into transparent 192x208 cells, so every generated pixel must either belong to the pet sprite or be cleanly removable chroma-key background. Prefer pose, expression, and silhouette changes over decorative effects.

Allowed effects must satisfy all of these conditions:

- The effect is state-relevant and helps explain the animation.
- The effect is physically attached to, touching, or overlapping the pet silhouette, not floating nearby.
- The effect is inside the same frame slot as the pet and does not create a separate sprite component.
- The effect is opaque, hard-edged, pixel-style, and uses non-chroma-key colors.
- The effect is small enough to remain readable at 192x208 without clutter.

Examples of allowed effects: a tear touching the face, a small smoke puff touching the box or head, or tiny stars overlapping the pet during a failed/dizzy reaction.

Avoid these by default because they usually break transparent-background cleanup or component extraction:

- wave marks, motion arcs, speed lines, action streaks, afterimages, blur, or smears
- detached stars, loose sparkles, floating punctuation, floating icons, falling tear drops, separated smoke clouds, or loose dust
- cast shadows, contact shadows, drop shadows, oval floor shadows, floor patches, landing marks, impact bursts, glow, halo, aura, or soft transparent effects
- text, labels, frame numbers, visible grids, guide marks, speech bubbles, thought bubbles, UI panels, code snippets, checkerboard transparency, white backgrounds, black backgrounds, or scenery
- chroma-key-adjacent colors in the pet, prop, effects, highlights, or shadows
- stray pixels, disconnected outline bits, speckle/noise, cropped body parts, overlapping poses, or any pose that crosses into a neighboring frame slot

State-specific guidance:

- `idle`: Keep the animation calm and low-distraction. Use subtle breathing,
  blinking, a small head or body bob, or slight material movement. Do not show
  other actions, emotional reactions, large gestures, item interactions, or new
  props.
- `waving`: show the wave through paw pose only. Do not draw wave marks, motion arcs, lines, sparkles, or symbols around the paw.
- `jumping`: show vertical motion through body position only. Do not draw shadows, dust, landing marks, impact bursts, bounce pads, or floor cues.
- `failed`: tears, attached smoke puffs, or attached stars are allowed if they obey the allowed-effects rules; do not use red X marks, floating symbols, detached smoke, detached stars, or separate tear droplets.
- `review`: show focus through lean, blink, eyes, head tilt, or paw position. Do not add magnifying glasses, papers, code, UI, punctuation, or symbols unless that prop already exists in the base pet identity.
- `running-right` and `running-left`: show directional locomotion through body, limb, and prop movement only. Do not draw speed lines, dust clouds, floor shadows, or motion trails.
- `running`: show an active working/in-progress loop, as if the pet is busy running a task. Do not show literal foot-running, jogging, sprinting, treadmill motion, raised knees, long steps, pumping arms, or directional travel.

## Pet Naming

Ask for a missing pet name only when the conversation allows it. For direct
execution requests, choose a short name from the concept, reference, or
personality. Use that name for both the display name and package folder slug.

Good built-in style examples:

- Codex: The original Codex companion.
- Dewey: A tidy duck for calm workspace days.
- Fireball: Hot path energy for fast iteration.
- Rocky: A steady rock when the diff gets large.
- Seedy: Small green shoots for new ideas.
- Stacky: A balanced stack for deep work.
- BSOD: A tiny blue-screen gremlin.
- Null Signal: Quiet signal from the void.

## Visible Progress Plan

Create a visible checklist before every pet run. Keep one step active and update
the checklist after each step.

Establish the pet name before creating the checklist when possible. Prefer the
user's name, then infer a short name from the concept or references. Use `your
pet` when no friendly short name is available.

Use this checklist for a normal pet run, replacing `<Pet>` with the pet's name or `your pet`:

1. Getting `<Pet>` ready.
2. Imagining `<Pet>`'s main look.
3. Picturing `<Pet>`'s poses.
4. Hatching `<Pet>`.

What each step means:

- `Getting <Pet> ready.` Choose or confirm the pet name, description, source images, and working folder.
- `Imagining <Pet>'s main look.` Generate the pet's main reference image. This is required for new pets, even when the user does not provide an image, because it becomes the visual source of truth.
- `Picturing <Pet>'s poses.` Create the pose rows, starting with `idle` and `running-right` to confirm the pet still looks consistent. Only mirror `running-left` if `running-right` clearly works when flipped.
- `Hatching <Pet>.` Build the final pet files from approved poses. Review the
  contact sheet, previews, and validation results. Repair failures, save
  `pet.json` and `spritesheet.webp`, and report the pet and QA paths.

Only mark a step complete when the real file, image, or decision exists. If this is just a repair run, start from the first relevant step instead of restarting the whole checklist.

## Default Workflow

1. Prepare a pet run folder and imagegen job manifest:

```bash
SKILL_DIR="$HOME/.agents/skills/hatch-pet"
python "$SKILL_DIR/scripts/prepare_pet_run.py" \
  --pet-name "<Name>" \
  --description "<one sentence>" \
  --reference /absolute/path/to/reference.png \
  --output-dir /absolute/path/to/run \
  --pet-notes "<stable pet description>" \
  --style-notes "<style notes>" \
  --force
```

All arguments are optional unless they express user constraints. For text-only
requests, pass the concept through `--pet-notes` and omit `--reference`.
`prepare_pet_run.py` will infer the remaining values.

2. Inspect the next ready `$imagegen` jobs:

```bash
python "$SKILL_DIR/scripts/pet_job_status.py" --run-dir /absolute/path/to/run
```

3. For each ready job, invoke `$imagegen` with:

- the prompt file listed in `imagegen-jobs.json`
- every input image listed for the job, with its role label
- the default built-in `image_gen` path unless `$imagegen` itself routes otherwise

Complete the base job first. Attach user references when they exist. The base
job may be prompt-only when no references exist. Recording the base writes
`decoded/base.png` and `references/canonical-base.png`. Attach the original and
canonical references to every row job.

`prepare_pet_run.py` creates one layout guide for each animation state under
`references/layout-guides/`. Attach the matching guide to each row job as a
layout-only input. The guide controls frame count, spacing, centering, and safe
padding. Reject outputs that reproduce its boxes, borders, marks, labels,
colors, or background.

Treat the row prompt's identity lock as authoritative. Preserve the head, face,
markings, palette, prop, outline, proportions, and silhouette. Reject a row that
depicts a different pet, even when geometry checks pass.

Generate and record `running-right` before choosing the `running-left` method.
Compare it with the base and references. Mirror it only when the result
preserves identity, props, handedness, markings, lighting, details, and
direction. Derive the approved mirror with:

```bash
python "$SKILL_DIR/scripts/derive_running_left_from_running_right.py" \
  --run-dir /absolute/path/to/run \
  --confirm-appropriate-mirror \
  --decision-note "<why mirroring preserves this pet's identity>"
```

Do not mirror asymmetric markings, readable text, logos, handed props,
one-sided accessories, lighting, or direction-specific poses. Generate
`running-left` with `$imagegen` instead. Attach its row prompt, all listed
grounding images, and `decoded/running-right.png` as a gait reference.

For the built-in path, record the selected source image from `$CODEX_HOME/generated_images/.../ig_*.png`. Do not record files from the run directory, `tmp/`, hand-made fixtures, deterministic row folders, or post-processed copies as visual job sources.

4. After selecting a generated output for a job, ingest it:

```bash
python "$SKILL_DIR/scripts/record_imagegen_result.py" \
  --run-dir /absolute/path/to/run \
  --job-id <job-id> \
  --source /absolute/path/to/generated-output.png
```

This copies the image to the exact decoded path expected by the deterministic pipeline and records source metadata in `imagegen-jobs.json`.

5. When all jobs are complete, finalize:

```bash
python "$SKILL_DIR/scripts/finalize_pet_run.py" \
  --run-dir /absolute/path/to/run
```

Expected output:

```text
run/
  pet_request.json
  imagegen-jobs.json
  prompts/
  decoded/
  frames/frames-manifest.json
  final/spritesheet.png
  final/spritesheet.webp
  final/validation.json
  qa/contact-sheet.png
  qa/review.json
  qa/run-summary.json
  qa/videos/*.mp4
```

Package output is written outside the run directory by default. If `CODEX_HOME` is set, use it; otherwise use `$HOME/.codex`.

```text
${CODEX_HOME:-$HOME/.codex}/pets/<pet-name>/
  pet.json
  spritesheet.webp
```

Review `qa/contact-sheet.png`, `qa/review.json`, `final/validation.json`, and `qa/videos/` before accepting the pet.

Visually inspect the contact sheet after deterministic validation. Reject any
row that unexpectedly changes the body type, face, markings, palette, prop,
prop side, or silhouette.

## Subagent Row Generation

Use subagents for row generation after recording the base image, unless the
user opts out for this session. Before generation, name the delegated row jobs.
If the environment blocks subagents, stop before generating rows. Explain the
blocker and ask whether to continue sequentially.

The parent agent must own the manifest and package writes.

Default flow:

1. Parent runs `prepare_pet_run.py`.
2. Parent generates and records `base`.
3. Parent runs `pet_job_status.py`.
4. Parent spawns subagents for `idle` and `running-right` first as identity and gait checks.
5. Parent records the selected `idle` and `running-right` results returned by subagents.
6. Parent decides whether `running-left` is safe to derive by mirror; if not, parent treats it as a normal grounded row job delegated to a subagent.
7. Parent spawns subagents for every remaining non-derived row image-generation job.
8. Each subagent receives the row prompt and every listed input image path, invokes `$imagegen`, and returns only the selected `$CODEX_HOME/generated_images/.../ig_*.png` source path.
9. Parent alone runs `record_imagegen_result.py`, `derive_running_left_from_running_right.py`, repair queueing, finalization, QA, and packaging.

Subagent write boundary: do not let subagents edit `imagegen-jobs.json`, copy files into `decoded/`, run `record_imagegen_result.py`, run `derive_running_left_from_running_right.py`, run `finalize_pet_run.py`, or package the pet. This avoids manifest races and keeps provenance checks centralized.

Subagent handoff contract:

- Give each subagent exactly one row job unless you are intentionally batching adjacent simple rows.
- Include the row id, the absolute prompt file path, the full prompt text or an instruction to read that exact prompt file, and every input image path with its role label from `imagegen-jobs.json`.
- Remind the subagent that transparency and effects rules are mandatory. Ban
  detached effects, wave marks, speed lines, and dust. Ban literal foot-running
  in the non-directional `running` row. Allow only attached opaque sprite
  effects that the state prompt permits.
- Tell the subagent to inspect the generated candidate for frame count, identity consistency, clean flat chroma-key background, safe spacing, and forbidden detached effects before returning it.
- Tell the subagent to return only the selected original `$CODEX_HOME/generated_images/.../ig_*.png` source path plus a one-sentence QA note. The parent decides whether to record or repair it.

Use this template for each subagent:

```text
Generate the `<row-id>` row for this hatch-pet run.

Run dir: <absolute run dir>
Prompt file: <absolute prompt file>
Input images:
- <absolute path>: <role>
- <absolute path>: <role>

Read and follow the row prompt exactly, including the Transparency and artifact rules. Use `$imagegen` only; do not use local scripts to draw, tile, edit, or synthesize sprites.

Before returning, visually check:
- exact requested frame count
- same pet identity as the canonical base
- clean flat chroma-key background
- complete, separated, unclipped poses
- no forbidden detached effects or slot-crossing artifacts

Do not edit manifests, copy into decoded, record results, mirror rows, finalize, repair, or package. Return only:
selected_source=/absolute/path/to/$CODEX_HOME/generated_images/.../ig_*.png
qa_note=<one sentence>
```

Do not fall back to sequential row generation without approval. Continue only
after an explicit instruction such as "do not use subagents" or "run this
sequentially." In the final answer, identify delegated, mirrored, and
parent-repaired rows.

## Repair Workflow

If finalization stops because row QA failed, queue targeted repair jobs:

```bash
python "$SKILL_DIR/scripts/queue_pet_repairs.py" \
  --run-dir /absolute/path/to/run
```

Then repeat the `$imagegen` generation and `record_imagegen_result.py` ingest loop for each reopened row job. Regenerate the smallest failing scope: the failed row, not the whole sheet.

For identity repairs, use the canonical base image, original references, contact sheet, and exact row failure note as grounding context. Repair only the failed row while preserving the canonical pet identity.

## Secondary Image Generation Fallback

`scripts/generate_pet_images.py` is a secondary fallback for this skill.

Use it only when the environment cannot invoke the installed `$imagegen` skill.
Normal pet creation delegates visuals to `$imagegen`, which owns generation and
fallback selection.

Run the secondary fallback only after explaining why `$imagegen` cannot be used:

```bash
python "$SKILL_DIR/scripts/generate_pet_images.py" \
  --run-dir /absolute/path/to/run \
  --model gpt-image-2 \
  --states all
```

The secondary fallback requires `OPENAI_API_KEY`.

## Rules

- Keep `$imagegen` as the primary generation layer.
- Keep reference images attached/visible for `$imagegen` whenever the chosen path supports references.
- Attach the row's `references/layout-guides/<state>.png` image to every row-strip job as a layout-only guide, and do not accept outputs that copy guide pixels.
- Use subagents for row strips after the parent records the base image. The
  parent may generate the base. Delegate row jobs unless the user opts out for
  this session.
- Generate every normal visual job with `$imagegen`: base plus all row strips that are not explicitly approved `running-left` mirror derivations.
- Treat only the base job as eligible for prompt-only generation; every row job must attach its listed grounding images.
- Delegate `running-right` first, then mirror `running-left` only when visual inspection confirms a mirror preserves identity and semantics; otherwise delegate `running-left` as a normal grounded `$imagegen` row.
- Never substitute locally drawn, tiled, transformed, or code-generated row strips for missing `$imagegen` outputs.
- Never manually mutate `imagegen-jobs.json` to claim a visual job completed.
- Do not rely on generated images for exact atlas geometry; use this skill's deterministic scripts.
- Use the chroma key stored in `pet_request.json`; do not force a fixed green screen.
- Keep the pet's silhouette, face, materials, palette, and props consistent across all rows.
- Enforce the transparency and effects rules above in every base, row, and repair prompt.
- Treat visual identity drift as a blocker even when `qa/review.json` and `final/validation.json` have no errors.
- Treat a contact sheet that shows cropped references, repeated tiles, white cell backgrounds, or non-sprite fragments as failed.
- Treat forbidden detached effects, chroma-key-adjacent artifacts, shadows, glows, smears, dust, landing marks, wave marks, speed lines, or motion trails as failed rows.
- Treat `qa/review.json` errors as blockers. Warnings require visual review.

## Acceptance Criteria

- Final atlas is PNG or WebP, `1536x1872`, transparent-capable, and based on `192x208` cells.
- Used cells are non-empty and unused cells are fully transparent.
- Atlas follows the row/frame counts in `references/animation-rows.md`.
- Contact sheet and preview videos have been produced unless explicitly skipped.
- `qa/review.json` has no errors.
- Row-by-row review confirms the animation cycles are complete enough for the Codex app.
- `${CODEX_HOME:-$HOME/.codex}/pets/<pet-name>/pet.json` and `${CODEX_HOME:-$HOME/.codex}/pets/<pet-name>/spritesheet.webp` are staged together for custom pets.
