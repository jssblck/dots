# Manage Color Contrast

Text and interactive elements need sufficient contrast against their
backgrounds, both for accessibility compliance and for plain readability.

## WCAG AA thresholds

- **Normal text (under 18px):** 4.5:1 minimum
- **Large text (18px+ bold, or 24px+):** 3:1 minimum
- **UI component boundaries (buttons, inputs):** 3:1 minimum
- **Focus indicators:** 3:1 against adjacent colors

## Quick reference on white

| Text color | Ratio | Passes AA |
|---|---|---|
| `#000000` | 21:1 | yes |
| `#333333` | 12.6:1 | yes |
| `#666666` | 5.9:1 | yes |
| `#757575` | 4.6:1 | yes, at the floor |
| `#999999` | 2.8:1 | no |
| `#CCCCCC` | 1.6:1 | no |

## Common failure modes

| Failure | Description | Fix |
|---|---|---|
| Light grey body text | `#999` or lighter on white | `#666` minimum, `#333` preferred |
| Ghost placeholder | Placeholder same shade as entered text | Lighten placeholder (around `#999`) so states differ |
| Low-contrast primary | White text on a light brand color | Darken the brand shade or switch to dark text |
| Subtle links | Links barely different from body | Underline or increase contrast |
| Prominent disabled | Disabled buttons look active | Drop to grey or ~30% opacity |
| Faded icons | Icons too light to see | Match adjacent text color |

A related rule from the source book: don't put grey text on colored
backgrounds. Grey works on white because it reduces contrast with the
background; on a colored background, pick a color closer to the background hue
(hand-tuned, not white at reduced opacity, which looks washed out).

## Worked example

Body text `#888888` on white is roughly 3.5:1 and fails the 4.5:1 requirement.
Move to `#666666` (5.9:1) at minimum; prefer `#333333` or darker for body
copy.
