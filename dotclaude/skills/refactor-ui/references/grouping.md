# Group Related Elements

Elements that are close together are perceived as related; elements farther
apart are perceived as unrelated. Use that (the Gestalt proximity principle)
to show structure with spacing instead of borders and boxes.

## Spacing hierarchy

Tightest within a component, looser between components, loosest between
sections:

```
Within a component (label + input):  4-8px
Between related components:          16-24px
Between sections:                    32-64px
Between major page areas:            64-96px
```

## Common patterns

| Pattern | Structure | Spacing |
|---|---|---|
| Form field | Label above input | 4-8px between, 16-24px after the pair |
| Card | Header, content, footer | 16-24px internal padding |
| List | Items in sequence | 8-12px between items |
| Button group | Primary + secondary | 8-12px between |
| Sections | Section A, gap, section B | 48-64px between |

## Pass / fail

**Pass:** related elements sit close (8-16px), unrelated groups sit far apart
(24-48px), labels hug their inputs (4-8px), and the space hierarchy above is
visible in the layout.

**Fail:** uniform spacing everywhere, labels drifting from their inputs,
related elements visually disconnected, unrelated elements crowding each
other, or borders doing the grouping that proximity should.

## Common failure modes

| Failure | Description | Fix |
|---|---|---|
| Uniform spacing | Same gap within and between groups | Tighten within, expand between |
| Label drift | Labels 20px+ from their inputs | Reduce to 4-8px |
| Section smush | Sections barely separated | 48px+ between major sections |
| Border dependency | Boxes drawing the groups | Let space do it |
| Card clump | Cards touching | 16-24px gap between cards |

## Worked example

A form with uniform 8px margins between every label and input creates no
hierarchy: nothing indicates which label owns which input, and section
headers blend into the fields above them. Fix with 4px label-to-input, 24px
after each field group, 16px between fields within a section, and 48px above
each section header.
