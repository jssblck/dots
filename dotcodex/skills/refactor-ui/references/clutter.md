# Eliminate Visual Clutter

Remove visual elements that don't communicate meaning: borders, backgrounds,
shadows, separators, and icons that are only decoration. Whitespace, contrast,
and typography can usually do the same separating work more quietly.

## Elements to question

| Element | Ask | Usual answer |
|---|---|---|
| Borders | Does this need a line, or just space? | Space; use margin instead |
| Card backgrounds | Does this need a box, or just whitespace? | Whitespace can define the group |
| Separators | Does this need a rule, or a bigger gap? | Increase the gap |
| Shadows | Is this elevation, or decoration? | See [shadows.md](shadows.md) |
| Background colors | Is this color communicating anything? | If purely decorative, remove |
| Icons | Does this icon add meaning? | If decorative only, remove |

## The simplification pass

1. Remove borders; use spacing instead.
2. Remove backgrounds; let whitespace group.
3. Remove separator lines; increase the gap between sections.
4. Remove shadows except real elevation (modals, dropdowns).
5. Add back only what hierarchy or clarity genuinely needs.

## Pass / fail

**Pass:** every remaining visual element serves a function, whitespace does
the separating, backgrounds are rare and meaningful, and separator lines are
scarce.

**Fail:** a boxy look with borders on everything, decorative shadows on
static content, multiple separator lines between sections, a background color
on every component, or ornamentation with no message.

## Common failure modes

| Failure | Description | Fix |
|---|---|---|
| Border-itis | Every element boxed | Remove half or more of the borders, use space |
| Shadow spam | Shadows on static elements | Reserve for hover states and overlays |
| Separator overload | Lines between every section | Remove half, double the space |
| Background soup | Grey background on every card | White with space, or one subtle border |
| Icon explosion | Icons on every label and button | Keep only meaning-bearing icons |
| Decorative gradients | Gradients everywhere | Flatten, or keep one purposeful gradient |

## Worked example

A card with a 1px grey border, a `#f5f5f5` background, a small shadow, an
icon in the title, and separator lines above and below the content is doing
the same job five ways. Drop the background and shadow (a static card needs no
elevation), keep either the border or generous padding, replace the separator
lines with section padding, and keep the icon only if it carries meaning.
