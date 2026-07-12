# Apply Consistent Spacing

Use a systematic spacing scale to create rhythm, group related elements, and
separate sections. Start with too much whitespace and remove until it looks
right; elements given only minimum breathing room look "not actively bad" but
never great.

## The scale

Base 16px, minimum 25% jumps between adjacent values so each step is
distinguishable:

```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px
```

| Value | Typical use |
|---|---|
| 4px | Icon gaps, label-to-input coupling |
| 8px | Small component gaps, tight button padding |
| 12px | Input padding, component internals |
| 16px | Standard gap, card padding |
| 24px | Section internal padding, group separation |
| 32px | Major section separation |
| 48-64px | Page section breaks |
| 96px | Hero sections, major page divisions |

## Principles

1. **More space around groups than within them.** Proximity signals
   relationship, so ambiguous spacing (label-to-input gap equal to
   input-to-next-label gap) makes ownership unreadable. Within-group gaps of
   4-16px, between-group gaps of 24-64px.
2. **Start with too much whitespace, then remove.** Adding space until it
   stops looking bad systematically undershoots.
3. **Don't fill the whole screen.** A 1200px canvas doesn't obligate 1200px
   content; give elements the space they need and leave the rest as
   whitespace. A 600px paragraph under a 1200px nav is fine.
4. **Whitespace over borders.** Before adding a border to separate two things,
   try more space, a background-color change, or a subtle shadow; all are
   quieter than a line.

## Pass / fail

**Pass:** every gap comes from the scale, related elements sit closer than
unrelated ones, groups have more space around than within, and internal
padding (cards, buttons, inputs) is consistent.

**Fail:** arbitrary values (13px, 27px, 41px), adjacent values too similar to
distinguish, equal spacing within and between groups, content stretched to
fill the canvas, or borders doing work that spacing could.

## Worked example

A form where the label has 12px below it and the input also has 12px below it
fails: the next label floats equidistant between two inputs and the user
cannot tell which field it names. The fix is 4px from label to its input and
24px from input to the next label, so within-group (4px) is clearly smaller
than between-group (24px).
