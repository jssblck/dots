# Apply a Typography Scale

Create typographic hierarchy with a small, hand-crafted set of font sizes,
weights, and colors.

## Core rules

1. **Hand-crafted, not mathematical.** Avoid modular scales that produce
   fractional pixels; pick each size deliberately.
2. **Use px or rem, never em.** Em compounds in nested elements (a `1.25em`
   parent with a `0.875em` child yields 17.5px) and becomes unpredictable.
3. **Minimum 25% jumps between sizes.** 16px to 20px is a step; 16px to 18px is
   not distinguishable as hierarchy.
4. **Two weights only:** 400/500 for normal text, 600/700 for emphasis.
5. **Never below weight 400 for UI text.** Light weights are unreadable at
   small sizes.

## Recommended scales

Marketing page:

```
Hero:    48-60px, weight 700, line-height 1.1
H1:      36-40px, weight 700, line-height 1.2
H2:      28-32px, weight 600, line-height 1.3
Body:    16-18px, weight 400, line-height 1.6
Small:   14px,    weight 400, line-height 1.6
Caption: 12px,    weight 400, line-height 1.5
```

Application / dense UI:

```
H1:    30-36px, weight 700
H2:    24px,    weight 600
H3:    20px,    weight 600
H4:    16px,    weight 600
Body:  14-16px, weight 400
Small: 12-13px, weight 400
```

## Line height and line length

Line height is inversely proportional to size: small text (12-14px) needs
1.6-1.7 to help the eye find the next line, body (16px) wants 1.5-1.6, and
large headlines (30px+) tighten to 1-1.2. Keep lines at 45-75 characters
(max-width around 20-35em for paragraphs); if a paragraph must run wide,
raise line-height to 1.8-2.0 to compensate.

## Pass / fail

**Pass:** a small set of intentional sizes with clear jumps between roles,
hierarchy built from size plus weight, line-height, and color together, and
line length and line-height that fit the reading context.

**Fail:** tiny increments that create no hierarchy, weights too light for UI,
long-form lines over 75 characters, or em sizing compounding in nested
elements.

## Common failure modes

| Failure | Example | Fix |
|---|---|---|
| Em units | `1.25em` parent, `0.875em` child = 17.5px | Use px or rem |
| Micro-steps | 16px, 18px, 20px | 16px, 20px, 28px |
| Weight 300 | Light body text | Minimum 400 |
| Long lines | 100+ characters | Constrain to ~35em |
| Uniform line-height | 1.5 everywhere | Vary inversely with size |
