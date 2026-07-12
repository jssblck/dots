---
name: refactor-ui
description: Use when designing, improving, or auditing UI visuals: visual hierarchy, typography scales, color palettes, spacing systems, button hierarchy, decluttering, empty states, shadows and elevation, color contrast and accessibility, or grouping and layout. Applies the ten principles from the book Refactoring UI (Adam Wathan and Steve Schoger) as pass/fail checks with concrete values, and can run a full-design audit that reports prioritized fixes. Invoke with /refactor-ui.
user-invocable: true
argument-hint: "[audit|<principle>] [target]"
license: MIT
metadata:
  version: "1.0.0"
  sources:
    - gnurio/refactoring-ui-plugin (MIT)
    - Refactoring UI, Adam Wathan and Steve Schoger
---

# Refactor UI

Ten composable design principles from *Refactoring UI*, each with pass/fail
criteria and concrete values. Use one principle to fix a specific problem, or
run all ten as an audit. This SKILL.md is the summary and router; each
reference file carries the workflow, the values, the failure modes, and a
worked example.

## How to use this skill

1. **Fixing a specific problem** (a weak CTA, a muddy palette, a cramped
   form): find the principle in the router below and read its reference file
   before proposing changes.
2. **Auditing a whole design**: follow the audit workflow at the bottom,
   loading each reference as you apply it.
3. **Building something new**: apply the principles in the sequence order
   given in the router (hierarchy first, polish last).

## Principle router

In application order. Later principles depend on earlier ones (buttons need
the palette, clutter removal needs the spacing system).

| # | Principle | One-line rule | Reference |
|---|---|---|---|
| 1 | Visual hierarchy | Decide what draws attention first, second, third; use weight and color, not just size | [references/visual-hierarchy.md](references/visual-hierarchy.md) |
| 2 | Typography scale | A small hand-crafted set of sizes with 25%+ jumps; px/rem, never em | [references/typography.md](references/typography.md) |
| 3 | Color palette | 8-10 greys, 5-10 shades per primary and accent, defined up front | [references/color-palette.md](references/color-palette.md) |
| 4 | Consistent spacing | A systematic scale; more space around groups than within them | [references/spacing.md](references/spacing.md) |
| 5 | Button hierarchy | One obvious primary per screen; secondary and tertiary visibly subordinate | [references/buttons.md](references/buttons.md) |
| 6 | Eliminate clutter | Remove borders, backgrounds, and decoration that carry no meaning | [references/clutter.md](references/clutter.md) |
| 7 | Empty states | A zero-content screen is onboarding: explain, illustrate, give a CTA | [references/empty-states.md](references/empty-states.md) |
| 8 | Shadows | Shadow means elevation; 2-3 consistent levels, subtle on cards, big on modals | [references/shadows.md](references/shadows.md) |
| 9 | Color contrast | WCAG AA: 4.5:1 normal text, 3:1 large text and UI boundaries | [references/contrast.md](references/contrast.md) |
| 10 | Group related elements | Proximity shows relationships; tightest within components, loosest between sections | [references/grouping.md](references/grouping.md) |

## Audit workflow

For "review this design" or "why does this look off":

1. **Apply all ten principles in order**, reading each reference file and
   recording a pass/fail with evidence (the specific element and value that
   violates it).
2. **Consolidate**: drop duplicates (the same issue often trips several
   principles; report it once under the root cause), then rank by severity.
   Critical means it breaks usability or accessibility (contrast failures,
   buried primary actions); high means it visibly degrades the design
   (ambiguous spacing, palette gaps); medium/low is polish.
3. **Report** a short prioritized fix list, each item naming the principle,
   the location, and the concrete change (exact sizes, hex values, spacing
   steps pulled from the references).

A clean result is a valid outcome; do not pad the report with speculative
polish. When only part of a design is in scope, audit only the principles it
touches.

## Precedence

An existing design system wins over this skill's example values. When the repo
already has a type scale, spacing tokens, or a palette, judge against and
extend those; flag them only when they violate a principle itself (a spacing
scale with 10% steps, a grey ramp with three shades).
