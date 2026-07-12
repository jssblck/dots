# Use Shadows Appropriately

Shadows convey elevation: how close a surface floats to the user. Used that
way they clarify structure; used as decoration they add clutter. The nuance:
a small, low-opacity shadow on a card is fine and often better than a border,
while a large flashy shadow on static content is wrong.

## Elevation scale

Two or three levels applied consistently beat per-component improvisation:

| Level | Use | Approximate CSS |
|---|---|---|
| None | Static content, text, icons | `none` |
| Subtle | Cards, as a quieter alternative to borders | `0 2px 4px rgba(0,0,0,0.1)` |
| Low | Raised cards, buttons on hover | `0 4px 6px rgba(0,0,0,0.1)` |
| Medium | Dropdowns, popovers, tooltips | `0 10px 15px rgba(0,0,0,0.1)` |
| High | Modals, dialogs, drawers | `0 20px 25px rgba(0,0,0,0.15)` |

## Principles

1. Shadows indicate elevation: higher in the scale means closer to the user,
   so a modal must cast a visibly larger shadow than the cards behind it.
2. Shadows can indicate interactivity: a subtle shadow increase on hover reads
   as "clickable".
3. Good shadows are barely noticeable; use low-opacity rgba, never pure black.
4. Same elevation, same shadow, everywhere.

## Pass / fail

**Pass:** modals carry a large shadow, dropdowns a medium one, cards a subtle
one or none, hover states may gain a slight shadow, static elements have
none, and the whole app uses 2-3 consistent levels.

**Fail:** large decorative shadows on static cards, inconsistent shadow
values across similar elements, shadows on text or icons, or a modal whose
shadow matches the cards so it doesn't read as above the page.

## Common failure modes

| Failure | Description | Fix |
|---|---|---|
| Shadow carpet | Every card heavily shadowed | Flatten static cards; subtle shadows only |
| Decorative depth | Heavy shadows as ornament | Reserve shadow for elevation and interaction |
| Inconsistent depth | Similar elements, different shadows | Define 2-3 levels, apply consistently |
| Black shadows | Pure black, harsh edges | Low-opacity rgba, optionally tinted to brand |
| Flat modal | Modal shadow equals card shadow | Increase spread and blur at the top level |

## Worked example

A page where cards use `0 4px 6px`, buttons `0 2px 4px`, the modal also
`0 4px 6px`, and a heading has a text-shadow fails: the modal doesn't
separate from the page and the text-shadow is pure decoration. Remove the
text-shadow, flatten the cards or drop them to the subtle level, keep button
shadows for hover only, and raise the modal to `0 20px 25px rgba(0,0,0,0.15)`.
