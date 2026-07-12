# Build a Color Palette

Build a comprehensive, systematic palette up front: 8-10 greys, 5-10 shades of
one or two primary colors, and 5-10 shades of each accent. Five hex codes from
a palette generator cannot build a real interface; you end up improvising
shades with opacity and the UI turns inconsistent.

## Palette structure

**Greys (8-10 shades).** The majority of any UI is grey: text, backgrounds,
panels, borders, form controls. Start from a dark grey (not true black, which
is harsh) and step to white in steady increments:

```
#F9FAFB  near-white backgrounds
#F3F4F6  subtle backgrounds
#E5E7EB  borders, dividers
#D1D5DB  disabled states
#9CA3AF  placeholder text
#6B7280  secondary text
#4B5563  body text
#374151  strong text
#1F2937  headings
#111827  near-black text
```

**Primary (5-10 shades).** One or two colors that define the overall look:
ultra-light for alert backgrounds, light for hover states, base for buttons
and links, dark for hover text and emphasis, very dark for text on light
backgrounds.

**Accents (5-10 shades each).** Used sparingly for meaning: red for
destructive actions and errors, yellow/amber for warnings and new-feature
callouts, green for success and positive trends, plus teal/pink/purple as
needed for categorization (charts, calendars, tags). Each accent needs its own
shade ramp, just like the primary.

Define shades by adjusting lightness in HSL: 95-98% for ultra-light
backgrounds, 80-90% for hover backgrounds, 45-55% for the base, 20-35% for
dark text and emphasis, 10-15% for headings.

## Pass / fail

**Pass:** 8-10 greys, 5-10 shades per primary and accent, a systematic
light-to-dark progression defined up front, explicit hex values (no opacity
tricks), and all text meeting WCAG AA contrast (see
[contrast.md](contrast.md)).

**Fail:** 3-4 greys forcing compromises, a primary with no shade ramp (so
hover states and subtle backgrounds get improvised), missing semantic colors,
or `rgba()` opacity used to fake lighter shades (inconsistent over varied
backgrounds).

## Common failure modes

| Failure | Description | Fix |
|---|---|---|
| 5-color generator palette | Five hex codes for the whole UI | Build the full ramp structure above |
| Too few greys | 3-4 shades leading to compromises | Expand to 8-10 from near-white to near-black |
| Opacity for shades | `rgba()` to lighten or darken | Define explicit hex shades up front |
| Missing hover states | No lighter/darker variant to shift to | Every interactive color gets a ramp |
| Missing semantic colors | Brand colors only | Add red, yellow, green accent ramps |
| True black text | `#000000` is harsh | Start from `#111827` or `#1F2937` |

## Worked example

Input: Brand Blue `#0066FF`, Light Blue `#E6F2FF`, White, Grey `#999999`,
Black. Verdict: fail. Two blue shades where 5-10 are needed, one grey where
8-10 are needed, no semantic colors at all. The fix is the ramp structure
above: 10 greys, an 8-shade blue ramp (`#EFF6FF` through `#1D4ED8`), and 7-8
shade ramps for red, yellow, and green.
