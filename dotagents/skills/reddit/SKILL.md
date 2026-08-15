---
name: reddit
description: >
  Read and act on Reddit as u/whimsicaljess through the signed-in Chrome
  session on the shared computer. Use page-level browser tools only.
  Open old.reddit.com URLs for inbox, user, listings, search, and threads.
  Write (comment, post, vote, message) only when Jess explicitly asks.
---

# Reddit (signed-in Chrome)

Act as u/whimsicaljess by driving the shared computer's Chrome profile
where she is already signed in. Use page-level browser tools only
(browserUse on Grok Bot).

Confirm the account menu or https://old.reddit.com/user/whimsicaljess
shows u/whimsicaljess before you do anything else. If Chrome is logged
out, stop and have her sign in on that Chrome. Do not invent a
workaround.

## Direct URLs

Open these. Do not click through the site to rebuild them.

- Inbox: https://old.reddit.com/message/inbox
- Unread: https://old.reddit.com/message/unread
- Mentions: https://old.reddit.com/message/mentions
- User: https://old.reddit.com/user/whimsicaljess
- Front: https://old.reddit.com/{hot|new|rising|top}
- Listing: https://old.reddit.com/r/{sub}/{hot|new|rising|top}
- Search: https://old.reddit.com/search?q={query}
- Sub search: https://old.reddit.com/r/{sub}/search?q={query}&restrict_sr=on
- Thread: https://old.reddit.com/r/{sub}/comments/{id}/

## Read (default)

"Check reddit" is read-only. Open the URL, read the page, report titles,
permalinks, authors, and the specific ask. Do not dump the whole page
unless she wants it.

## Write (explicit ask only)

Do not comment, submit, vote, or message unless her current message
clearly asks for that action. After a write, report the permalink or
the on-page error.

## Forbidden

- Copying cookies, tokens, or profile files out of Chrome
- curl or any HTTP client with a copied session
- oauth.reddit.com, script apps, or ~/.reddit/credentials
- Attaching a debugger to Chrome or launching a second browser that
  copies her profile
- Creating a Reddit app or a new account

## What to tell her

- Read results: titles, permalinks, authors, and the specific ask.
- Write results: the permalink or the on-page error.
- Logged out: Chrome is not signed in as u/whimsicaljess. She needs to
  sign in on the shared computer.
