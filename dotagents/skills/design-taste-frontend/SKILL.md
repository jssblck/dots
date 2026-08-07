---
name: design-taste-frontend
description: Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check.
---

# tasteskill: Anti-Slop Frontend Skill

> Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI.
> Every rule below is **contextual**. None of it fires automatically. First read the brief, then pull only what fits.

---

## 0. BRIEF INFERENCE (Read the Room Before Anything Else)

Before touching code or tweaking dials, **infer what the user actually wants**. Most LLM design output is bad because the model jumps to a default aesthetic instead of reading the room.

### 0.A Read these signals first
1. **Page kind:** landing (SaaS / consumer / agency / event), portfolio (dev /
   designer / creative studio), redesign (preserve vs overhaul), or editorial /
   blog.
2. **Vibe words:** terms such as "minimalist", "calm", "Linear-style",
   "Awwwards", "brutalist", "premium consumer", "Apple-y", "playful", "serious
   B2B", "editorial", "agency-y", "glassy", or "dark tech".
3. **Reference signals:** URLs, screenshots, named products, and competing
   brands.
4. **Audience:** a B2B procurement panel, design-conscious consumer, or
   recruiter scanning a portfolio. The audience determines the aesthetic.
5. **Existing brand assets:** logo, color, typography, and photography. Treat
   them as starting material for a redesign. See
   [references/redesign.md](references/redesign.md).
6. **Quiet constraints:** accessibility-first audiences, public-sector or
   regulated industries, trust-first commerce, and products for children.
   These constraints override aesthetic preference.

### 0.B Output a one-line "Design Read" before generating
Before any code, state in one line: **"Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<design system or aesthetic family>."**

Example reads:
- *"Reading this as: B2B SaaS landing for technical buyers, with a Linear-style minimalist language, leaning toward Tailwind utilities + Geist + restrained motion."*
- *"Reading this as: solo designer portfolio for hiring managers, with an editorial / kinetic-type language, leaning toward native CSS + scroll-driven animation + custom typography."*
- *"Reading this as: redesign of a public-sector service site, with a trust-first language, leaning toward GOV.UK Frontend or USWDS."*

### 0.C If the brief is ambiguous, ask one question, do not guess
Ask exactly **one** clarifying question only when the design read genuinely
diverges. Never send a group of questions. Example: *"Should this feel closer
to Linear-clean or Awwwards-experimental?"*

If you can confidently infer from context, **do not ask**. Just declare the design read and proceed.

### 0.D Anti-Default Discipline
Do not default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism on everything, infinite-loop micro-animations everywhere, Inter + slate-900. These are the LLM defaults. Reach past them deliberately based on the design read.

---

## 1. THE THREE DIALS (Core Configuration)

After the design read, set three dials. Every layout, motion, and density decision below is gated by these.

* **`DESIGN_VARIANCE: 8`:** 1 = Perfect Symmetry, 10 = Artsy Chaos
* **`MOTION_INTENSITY: 6`:** 1 = Static, 10 = Cinematic / Physics
* **`VISUAL_DENSITY: 4`:** 1 = Art Gallery / Airy, 10 = Cockpit / Packed Data

**Baseline:** `8 / 6 / 4`. Use these unless the design read overrides them. Ask
for overrides in the conversation rather than asking the user to edit this
file.

### 1.A Dial Inference (design read → dial values)
| Signal | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| "minimalist / clean / calm / editorial / Linear-style" | 5-6 | 3-4 | 2-3 |
| "premium consumer / Apple-y / luxury / brand" | 7-8 | 5-7 | 3-4 |
| "playful / wild / Dribbble / Awwwards / experimental / agency" | 9-10 | 8-10 | 3-4 |
| "landing page / portfolio / marketing site (default)" | 7-9 | 6-8 | 3-5 |
| "trust-first / public-sector / regulated / accessibility-critical" | 3-4 | 2-3 | 4-5 |
| "redesign: preserve" | match existing | +1 | match existing |
| "redesign: overhaul" | +2 | +2 | match existing |

### 1.B Use-Case Presets
| Use case | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| Landing (SaaS, mainstream) | 7 | 6 | 4 |
| Landing (Agency / creative) | 9 | 8 | 3 |
| Landing (Premium consumer) | 7 | 6 | 3 |
| Portfolio (Designer / studio) | 8 | 7 | 3 |
| Portfolio (Developer) | 6 | 5 | 4 |
| Editorial / Blog | 6 | 4 | 3 |
| Public-sector service | 3 | 2 | 5 |
| Redesign: preserve | match | match+1 | match |
| Redesign: overhaul | +2 | +2 | match |

### 1.C How the Dials Drive Output
Use these values as global variables unless the user overrides them. Keep the
exact variable names throughout the document. Do not create aliases such as
`LAYOUT_VARIANCE` or `ANIM_LEVEL`.

---

## 7. DIAL DEFINITIONS (Technical Reference)

### DESIGN_VARIANCE (Level 1-10)
* **1-3 (Predictable):** Symmetrical CSS Grid (12-col, equal fr-units), equal paddings, centered alignment.
* **4-7 (Offset):** `margin-top: -2rem` overlaps, varied image aspect ratios (4:3 next to 16:9), left-aligned headers over center-aligned data.
* **8-10 (Asymmetric):** Masonry layouts, CSS Grid with fractional units (`grid-template-columns: 2fr 1fr 1fr`), massive empty zones (`padding-left: 20vw`).
* **MOBILE OVERRIDE:** For levels 4-10, asymmetric layouts above `md:` MUST collapse to strict single-column (`w-full`, `px-4`, `py-8`) on viewports `< 768px`.

### MOTION_INTENSITY (Level 1-10)
* **1-3 (Static):** No automatic animations. CSS `:hover` and `:active` states only. `prefers-reduced-motion` is the default mode anyway.
* **4-7 (Fluid CSS):** `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`. `animation-delay` cascades for load-ins. Focus on `transform` and `opacity`.
* **8-10 (Advanced Choreography):** Use complex scroll-triggered reveals,
  parallax, and scroll-driven animation through CSS `animation-timeline` or
  GSAP ScrollTrigger. Use Motion hooks. **Never use
  `window.addEventListener('scroll')`.** See 5.D in
  [references/motion.md](references/motion.md) for the allowed alternatives.

### VISUAL_DENSITY (Level 1-10)
* **1-3 (Art Gallery):** Lots of white space. Huge section gaps (`py-32` to `py-48`). Expensive, clean.
* **4-7 (Daily App):** Standard web app spacing (`py-16` to `py-24`).
* **8-10 (Cockpit):** Tight paddings. No card boxes; 1px lines separate data. Mandatory: `font-mono` for all numbers.

---

## ROUTER (What to Read, When)

Everything below section 7 lives in `references/` and loads on demand. After
the design read and dials, read only what the task needs:

| Task | Read |
|---|---|
| Build a new page (every build) | [references/architecture.md](references/architecture.md), [references/directives.md](references/directives.md), [references/ai-tells.md](references/ai-tells.md), [references/motion.md](references/motion.md) |
| The design read points at a real design system, or you need install commands and canonical docs | [references/design-systems.md](references/design-systems.md) |
| Redesign an existing site | [references/redesign.md](references/redesign.md) first, then the build set above |
| Name or choose a pattern ("what is that hero style called") | [references/vocabulary.md](references/vocabulary.md) |
| Implement or add a reusable block | [references/blocks.md](references/blocks.md) |
| Before declaring any build done (mandatory) | [references/preflight.md](references/preflight.md) |

The pre-flight check is not optional: every build run ends by walking
[references/preflight.md](references/preflight.md) before shipping. Section
numbering from the original single-file layout is preserved inside the
reference files, so pointers like "4.7" or "9.G" remain stable.

## 13. OUT OF SCOPE

This skill is NOT for:
* Dashboards / dense product UI / admin panels (use Fluent, Carbon, Atlassian, or Polaris from 2.A in [references/design-systems.md](references/design-systems.md)).
* Data tables (use TanStack Table or AG Grid).
* Multi-step forms / wizards (use Form-specific patterns; this skill won't make them better).
* Code editors (use Monaco / CodeMirror with their official skinning).
* Native mobile (use Apple HIG / Material directly).
* Realtime collaboration UIs (presence, cursors, and OT-aware state) belong to
  a different problem class.

If the brief is one of the above, **say so explicitly**, point to the right tool, and only apply this skill's marketing-page / about-page / landing-page parts to the surfaces where they apply.

---

## Reference index

- [references/design-systems.md](references/design-systems.md): the
  brief-to-design-system map, vendored installation commands, and canonical
  documentation links (Appendices A-C)
- [references/architecture.md](references/architecture.md): the default stack,
  state, icons, emoji policy, responsiveness, and dependency verification
- [references/directives.md](references/directives.md): bias-correction
  directives and the dark mode protocol
- [references/motion.md](references/motion.md): scroll patterns, forbidden
  animation patterns, and performance and accessibility guardrails
- [references/ai-tells.md](references/ai-tells.md): forbidden AI patterns,
  including the em dash ban
- [references/vocabulary.md](references/vocabulary.md): vocabulary for heroes,
  navigation, grids, cards, scrolling, galleries, typography, and
  micro-interactions
- [references/redesign.md](references/redesign.md): mode detection,
  audit-first work, preservation rules, and modernization options
- [references/blocks.md](references/blocks.md): the block library contract
- [references/preflight.md](references/preflight.md): the final preflight
  checklist
