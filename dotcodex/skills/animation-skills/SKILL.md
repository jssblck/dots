---
name: animation-skills
description: Use for any web animation or motion work. Covers designing and building animations (easing, duration, springs, gestures, drag, clip-path, @starting-style, performance, reduced motion), reviewing animation code in a diff against a high craft bar, auditing a whole codebase's motion and writing executor-ready improvement plans, Apple-style fluid interfaces (interruptibility, velocity handoff, momentum projection, rubber-banding, translucent materials), and naming a motion effect the user can only describe ("what's it called when..."). Distilled from Emil Kowalski's design engineering philosophy (animations.dev) and Apple's WWDC design talks.
user-invocable: true
argument-hint: "[build|review|improve|apple|vocab] [target]"
license: MIT
metadata:
  version: "1.0.0"
  sources:
    - emilkowalski/skills (MIT)
    - Emil Kowalski, animations.dev and emilkowal.ski
    - Apple WWDC design talks (Designing Fluid Interfaces, 2018)
---

# Animation Skills

One skill for motion work on the web, from picking an easing curve to auditing
a whole codebase's animation. The core rules below always apply; the reference
files carry the depth and load on demand.

## How to use this skill

1. **Apply the core rules below.** They decide most animation questions before
   any code is written.
2. **Pick the mode that matches the task** from the router and read its
   reference file(s). Load only what the task needs.
3. When a finding or a plan needs a precise value (a cubic-bezier, a duration,
   a spring config), pull it from [references/standards.md](references/standards.md)
   rather than approximating from memory.

## Core rules

These hold for every mode. Each has depth in the references.

1. **Ask "should this animate at all?" first.** Frequency decides: actions hit
   100+ times a day (keyboard shortcuts, command palette) get no animation ever,
   occasional UI (modals, drawers, toasts) gets standard animation, and rare
   moments (onboarding, celebrations) can have delight. Deleting an animation is
   often the strongest fix.
2. **Every animation needs a purpose**: spatial consistency, state indication,
   feedback, explanation, or preventing a jarring change. "It looks cool" on a
   frequently seen element is not a purpose.
3. **Easing: `ease-out` for enter/exit, `ease-in-out` for on-screen movement,
   never `ease-in` on UI.** Built-in CSS curves are too weak; use strong custom
   cubic-beziers as shared tokens.
4. **UI animations stay under 300ms.** Per-element budgets are in
   [references/standards.md](references/standards.md).
5. **Physicality**: never enter from `scale(0)`; start at `scale(0.9-0.97)` plus
   opacity. Popovers and dropdowns scale from their trigger via
   `transform-origin` (modals are exempt and stay centered). Pressable elements
   get `scale(0.97)` on `:active`.
6. **Interruptibility**: rapidly triggered or gesture-driven motion uses CSS
   transitions or springs that retarget from the current state, never keyframes
   that restart from zero.
7. **Performance**: animate `transform` and `opacity` only, never
   `transition: all`, and know that Framer Motion `x`/`y`/`scale` shorthands run
   on the main thread.
8. **Accessibility**: honor `prefers-reduced-motion` (gentler, not zero) and
   gate hover motion behind `@media (hover: hover) and (pointer: fine)`.

## Mode router

| Task | Read |
|---|---|
| Build or polish an animation, component motion, gestures, drag, clip-path tricks | [references/design-engineering.md](references/design-engineering.md) |
| Apple-style fluid interfaces: springs, velocity handoff, momentum, rubber-banding, materials, typography | [references/apple-design.md](references/apple-design.md) |
| Review animation code in a diff (findings table + block/approve verdict) | [references/review.md](references/review.md), values from [references/standards.md](references/standards.md) |
| Audit a codebase's motion and write plans for other agents to execute | [references/improve.md](references/improve.md), with [references/audit.md](references/audit.md) and [references/plan-template.md](references/plan-template.md) |
| Name an effect the user can only describe ("what's it called when...") | [references/vocabulary.md](references/vocabulary.md) |

For building work, apple-design.md complements design-engineering.md whenever
the motion is gesture-driven or should feel physical; read both in that case.

## Precedence

Project instructions and existing motion conventions win over this skill. If a
repo already has easing tokens, duration scales, or spring configs, extend
those instead of introducing the values here, and say so.

## Reference index

- [references/design-engineering.md](references/design-engineering.md): Emil
  Kowalski's playbook for motion decisions, springs, components, transforms,
  gestures, performance, staggering, and debugging
- [references/apple-design.md](references/apple-design.md): Apple's
  fluid-interface principles translated to the web
- [references/review.md](references/review.md): diff review standards,
  escalation triggers, corrections, and output format
- [references/standards.md](references/standards.md): curves, duration tables,
  spring configurations, gesture thresholds, and accessibility examples
- [references/improve.md](references/improve.md): repository inspection,
  parallel audit, review, and self-contained plans
- [references/audit.md](references/audit.md): eight audit categories with exact
  target values
- [references/plan-template.md](references/plan-template.md): plan format for
  executors without prior context
- [references/vocabulary.md](references/vocabulary.md): glossary that maps a
  description to the precise motion term
