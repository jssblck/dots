# Establish Visual Hierarchy

Decide what draws attention first, second, and third, then enforce that order
with size, weight, color, and de-emphasis. Hierarchy controls the sequence in
which users process a screen; when everything is emphasized, nothing is.

## Workflow

1. **Identify the primary element.** What is the single most important thing on
   this screen: the action the user should take, or the information they came
   for?
2. **Assess current visual weight** of each element: size (larger draws more),
   weight (bolder reads as more important), color contrast (higher is more
   prominent), and surrounding whitespace (more space makes it stand out).
3. **Build hierarchy from multiple factors, not size alone.** Use weight
   (600-700) for emphasis and grey scale to de-emphasize, keeping sizes
   reasonable. A 40px headline at weight 700 beats a 60px headline at 400.
4. **De-emphasize the competitors.** When the primary element is not standing
   out, the fix is usually to soften what surrounds it (reduce contrast of
   secondary content, remove unnecessary backgrounds) rather than to make the
   primary louder.

## Pass / fail

**Pass:** the most important element carries the highest visual weight, the
hierarchy leans on weight and color rather than size alone, surrounding
elements are subdued, and there is a clear visual path from primary to
secondary to tertiary.

**Fail:** hierarchy relies solely on font size, everything is equally
emphasized, critical elements are buried, or decorative elements compete with
content.

## Patterns

Marketing page hero:

```
H1:   48px, weight 700, dark     <- primary
CTA:  16px, solid brand color    <- secondary
Body: 16px, weight 400, grey     <- tertiary
```

Dashboard card (the metric is the hero, not the card title):

```
Metric: 32px, weight 700, dark   <- primary
Label:  14px, weight 400, grey   <- secondary
Action: text link, brand color   <- tertiary
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Logo larger than headline | Brand over value proposition | Reduce logo, increase headline |
| 60px headline over 12px body | Size extremes instead of hierarchy | 40px + weight 700 headline, 16px body |
| All text bold | Nothing stands out | Reserve 600-700 for the few things that matter |
| Large section titles | Labels dominate the content they label | Make titles smaller and greyer than the content |
