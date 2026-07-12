# Design Button Hierarchy

Make one action per screen obviously primary, and make everything else
visually subordinate, so users never have to guess which button to press.

## Style levels

| Level | Background | Border | Text | Use |
|---|---|---|---|---|
| Primary | Brand color, solid | None | White/light | Main CTA, save, submit |
| Secondary | Grey solid or transparent | Brand color if outline | Brand color or grey | Alternative action, cancel |
| Tertiary | Transparent | None | Brand color or grey | Optional actions, learn more |
| Destructive | Red solid or red text | None | White or red | Delete, remove |
| Disabled | Grey 200 | None | Grey 400 | Cannot proceed |

Secondary actions should be clear but not prominent: outline styles or
lower-contrast solid backgrounds (including grey) both work. Destructive
actions use red for meaning but must not draw more attention than the primary;
when delete is not the main action of the screen, make it text-only red.

## Pass / fail

**Pass:** exactly one clearly primary action per screen or section (filled,
high contrast), secondary actions visibly subordinate, tertiary actions
minimal, and clear distinction between the levels rather than subtle 10%
differences.

**Fail:** multiple buttons with equal visual weight, no obvious primary, a
near-white grey secondary that reads as disabled, a destructive button
dominating the screen, or every button filled with the same color.

## Common failure modes

| Failure | Description | Fix |
|---|---|---|
| Button battle | Save and Cancel both filled with brand color | Cancel becomes outline or grey solid |
| Disabled-looking secondary | Grey 200 fill reads as inactive | Use grey 400-500 or an outline style |
| Red alert | Delete more prominent than the primary | Demote delete to text red |
| Primary overload | Three or more "primary" buttons | Pick one, demote the rest |
| Invisible tertiary | Text links styled like body text | Brand color or underline |

## Worked example

A modal with "Save Changes" (filled blue), "Cancel" (filled grey), and
"Delete" (filled red) is close but not right: grey fill is an acceptable
secondary, but filled red competes with the primary. Keep Save as filled
blue, keep or outline Cancel, and change Delete to text red so the
destructive path exists without competing.
