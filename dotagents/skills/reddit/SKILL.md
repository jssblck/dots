---
name: reddit
description: >
  Read and act on Reddit as Jess's existing account through the signed-in
  Chrome session on the shared computer. Use for inbox, mentions, listings,
  search, and thread reads. Write (comment, post, vote, message) only when
  she explicitly asks. No Reddit app. Do not copy cookies or call unofficial
  APIs.
---

# Reddit (signed-in Chrome)

Act as Jess's existing Reddit account by driving the Chrome profile where
she is already signed in. She cannot create a Reddit script app. There is
no OAuth client and no credentials file.

Do not create a new Reddit user. Do not copy cookies, tokens, or storage
out of Chrome. Do not replay a session against reddit.com or any Reddit
API.

## How to use it

1. Open Chrome on the shared computer, using the same profile she uses.
2. Go to https://www.reddit.com
3. Confirm the account menu shows her username.
4. If the page is logged out, stop. Have her sign in on that Chrome.
5. Do the read or write in the page.

Use the harness browser or computer-use tools against that live Chrome.
Do not attach a debugger. Do not launch a second browser that copies her
profile files.

## Read (default)

"Check reddit" is read-only. Navigate and read the page.

- Inbox: https://www.reddit.com/message/inbox
- Unread: https://www.reddit.com/message/unread
- Mentions: https://www.reddit.com/message/mentions
- Listing: https://www.reddit.com/r/{sub}/{sort} or https://www.reddit.com/{sort}
- Search: https://www.reddit.com/search/?q=...
- Thread: the comments URL she gave, or search and then open it

Report titles, permalinks, authors, and the specific ask. Do not dump the
whole page unless she wants it.

## Write (explicit ask only)

Do not comment, submit, vote, or message unless her current message
clearly asks for that action.

After a write, report the resulting permalink or the on-page error.

## Forbidden

- Copying Chrome cookies, tokens, or profile files
- Calling Reddit HTTP APIs with a copied session
- Creating a Reddit app or a new account
- Printing or committing anything from the Chrome profile

## What to tell her

- Read results: titles, permalinks, authors, and the specific ask.
- Write results: the permalink or the on-page error.
- Logged out: Chrome is not signed into Reddit. She needs to sign in on
  the shared computer.
