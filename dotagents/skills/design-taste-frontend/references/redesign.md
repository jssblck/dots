# Redesign Protocol

## 11. REDESIGN PROTOCOL

This skill handles **greenfield builds AND redesigns**. Misclassifying the mode is the single biggest source of bad redesign output.

### 11.A Detect the Mode (first action)
* **Greenfield**: no existing site, or full overhaul approved. Dial baseline from SKILL.md section 1.
* **Redesign (Preserve):** Modernize without breaking the brand. Audit first,
  extract brand tokens, and evolve gradually.
* **Redesign (Overhaul):** Build a new visual language over the existing
  content. Treat visuals as greenfield work while preserving content and
  information architecture.

If ambiguous, ask **once**: *"Should this redesign preserve the existing brand, or are we starting visually from scratch?"*

### 11.B Audit Before Touching
Document the current state before proposing changes:
* **Brand tokens**: primary / accent colors, type stack, logo treatment, radii.
* **Information architecture**: page tree, primary nav, key conversion paths.
* **Content blocks**: what exists, what's doing work, what's filler.
* **Patterns to preserve**: signature interactions, recognisable hero, copy voice.
* **Patterns to retire**: AI-slop tells, broken layouts, dead links, generic stock imagery, perf traps.
* **Dial reading of the existing site**: infer current `DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`. That's your starting point, not the baseline.
* **SEO baseline**: current ranking pages, meta titles, structured data, OG cards. **SEO migration is the #1 redesign risk.**

### 11.C Preservation Rules
* **Do not change information architecture** unless asked. Keep page slugs, anchor IDs, primary nav labels stable for SEO and muscle memory.
* **Extract brand colors before applying `directives.md` 4.2.** A brand that is already purple stays purple: apply the LILA RULE's override.
* **Preserve copy voice** unless asked for a rewrite. Visual modernisation ≠ content rewrite.
* **Honor existing accessibility wins.** Do not regress focus states, alt text, keyboard nav, contrast.
* **Respect existing analytics events.** Do not rename buttons, form fields, section IDs that downstream tracking depends on.

### 11.D Modernisation Levers (priority order)
Apply in order: stop when the brief is satisfied:
1. **Typography refresh**: biggest visual lift per unit of risk.
2. **Spacing & rhythm**: increase section padding, fix vertical rhythm.
3. **Color recalibration**: desaturate, unify neutrals, keep brand accent.
4. **Motion layer**: add `MOTION_INTENSITY`-appropriate micro-interactions to existing components.
5. **Hero & key-section recomposition**: restructure top-of-funnel using the `vocabulary.md` pattern names.
6. **Full block replacement**: only when the existing block is unsalvageable.

### 11.E Decision Tree: Targeted Evolution vs Full Redesign
* IA, content, and SEO sound → **targeted evolution** (Levers 1-4). ~70% of value at ~40% of risk.
* Visual debt is structural (broken IA, no design system, broken mobile) → **full redesign** with strict content preservation.
* Brand itself is changing → **greenfield**.

### 11.F What Never Changes Silently
Never modify without explicit user approval:
* URL structure / route slugs.
* Primary nav labels.
* Form field names or order (breaks analytics + autofill).
* Brand logo or wordmark.
* Existing legal / consent / cookie copy.

---
