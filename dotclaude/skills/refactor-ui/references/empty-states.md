# Design Empty States

An empty state is an onboarding moment, not a dead end. A blank screen or a
grey "No data available" wastes the one moment when the user most needs to be
told what this area is for and how to fill it.

## Components of a good empty state

1. **Illustration or icon** (optional): relevant to the content type, not a
   generic 404-style graphic.
2. **Headline**: friendly and explanatory ("No projects yet", "Start your
   first campaign"), never bare "Empty" or "No items".
3. **Description**: one or two sentences on what this area is for and how to
   add content.
4. **Primary action**: a clear CTA button into the creation flow (style per
   [buttons.md](buttons.md)).
5. **Secondary info** (optional): a learn-more link, a template, or an import
   option.

Hide UI that is useless without content (tabs, filters, sort controls); they
add noise and imply broken functionality.

## Types

| Type | Context | Approach |
|---|---|---|
| First-time | New user, nothing created yet | Educate and onboard, clear CTA |
| User-cleared | User deleted everything | Confirm, offer undo, re-add CTA |
| No results | Search or filter matched nothing | Suggest adjusting filters or clearing search |
| No access | Permission restriction | Explain why and how to request access |
| Error | Failed to load | Retry action, support contact; do not dress an error as an empty state |

## Pass / fail

**Pass:** the state explains what would be here, tells the user how to add
content, provides a primary action, uses a relevant visual, keeps a positive
tone, and hides controls that need content to work.

**Fail:** a blank screen or bare "No data", a technical error message doing
duty as an empty state, no next step, a generic unrelated illustration, or
negative framing ("You have no friends" instead of "Connect with people").

## Worked example

A dashboard showing "No data available" in small grey text fails on every
axis: negative framing, no context, no action. Replace with headline "No
reports yet", description "Create your first report to start tracking
metrics", a primary "Create Report" button, and optionally a small
illustration or a template preview.
