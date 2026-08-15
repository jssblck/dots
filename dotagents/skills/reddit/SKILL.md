---
name: reddit
description: >
  Read and act on Reddit through the official OAuth API as Jess's existing
  account. Use for inbox, mentions, listings, search, and thread reads.
  Write (comment, post, vote, message) only when she explicitly asks.
  Official oauth.reddit.com only. No anonymous identity.
---

# Reddit (official API)

Act as Jess's existing Reddit account through a registered **script** app.
Read is the default. Write only when she explicitly asks.

Do not create a new Reddit user. Do not use application-only
(`client_credentials`) or any anonymous fallback.

Official hosts only:

- Token: `https://www.reddit.com/api/v1/access_token`
- API: `https://oauth.reddit.com`

Docs: https://github.com/reddit-archive/reddit/wiki/OAuth2
API: https://www.reddit.com/dev/api/oauth

## Requirements

- `curl`, `jq`
- Script app credentials in `~/.reddit/credentials` (chmod 600)
- Bundled helper: `./scripts/reddit.sh`

Never commit `~/.reddit/credentials`, `~/.reddit/token.json`, or API secrets.

## Auth

Credentials file (KEY=value, no quotes):

```
client_id=...
client_secret=...
username=...
password=...
```

Optional: `user_agent=linux:jess-dots-reddit:1.0 (by /u/USERNAME)`
If omitted, the helper builds that User-Agent from `username`.

Reddit requires a descriptive User-Agent. Generic agents get throttled or
blocked. Format: `platform:app_id:version (by /u/username)`.

### Check before any call

1. Read `~/.reddit/credentials`.
2. Request a token with the **password** grant (script apps only):

```bash
curl -sS -X POST https://www.reddit.com/api/v1/access_token \
  -u "${client_id}:${client_secret}" \
  -A "linux:jess-dots-reddit:1.0 (by /u/${username})" \
  -d "grant_type=password&username=${username}&password=${password}"
```

3. Call `GET https://oauth.reddit.com/api/v1/me` with
   `Authorization: bearer <access_token>`.
4. Proceed only when `name` matches `username` (case-insensitive).
5. If the file is missing, the token request fails, or `/me` is a different
   user: stop. Have Jess create a script app at
   https://www.reddit.com/prefs/apps (type **script**, redirect
   `http://localhost:8080`). Write the four fields to
   `~/.reddit/credentials` yourself (`mkdir -p`, `chmod 600`). Do not ask
   her to write the file. Never print the secret or password.

Prefer `./scripts/reddit.sh`. It loads credentials, caches the bearer token
in `~/.reddit/token.json` (1 hour), and refuses `client_credentials`.

## Rate limits

OAuth is about 60 requests per minute. Read `x-ratelimit-remaining`,
`x-ratelimit-used`, and `x-ratelimit-reset` on every response. If remaining
is 0, wait until reset. On HTTP 429, wait `Retry-After` (or the reset) and
retry once. Do not tight-loop.

## Read (default)

Use `./scripts/reddit.sh <cmd>`. JSON on stdout.

| Command | Official endpoint | Scope |
| --- | --- | --- |
| `me` | `GET /api/v1/me` | identity |
| `inbox` | `GET /message/inbox` | privatemessages |
| `unread` | `GET /message/unread` | privatemessages |
| `mentions` | `GET /message/mentions` | privatemessages |
| `listing [sub] [sort]` | `GET /r/{sub}/{sort}` or `GET /{sort}` | read |
| `search <query> [sub]` | `GET /search` or `GET /r/{sub}/search` | read |
| `thread <id-or-url>` | `GET /comments/{id}` | read |

`listing` sort is `hot` (default), `new`, `rising`, `top`, or `controversial`.
`thread` accepts a fullname (`t3_...`), a 6-7 char id, or a reddit comments URL.

Paginate with `after` from the listing (`--after <fullname>`). Do not fetch
HTML pages for more results.

## Write (explicit ask only)

Do not comment, submit, vote, or message unless Jess's current message
clearly asks for that action. "Check reddit" is read-only.

Write commands require `--confirm-write`:

| Command | Official endpoint | Scope |
| --- | --- | --- |
| `comment <parent> <text>` | `POST /api/comment` | submit |
| `submit <sub> <title> <url-or-text>` | `POST /api/submit` | submit |
| `vote <id> <up\|down\|clear>` | `POST /api/vote` | vote |
| `message <to> <subject> <text>` | `POST /api/compose` | privatemessages |

`parent` and vote `id` are fullnames (`t1_...` comment, `t3_...` post).
`submit` treats the third argument as a URL if it starts with `http`, else
as self-text.

## Forbidden

- Shared browser sessions or saved site cookies
- Unofficial or private Reddit APIs
- `grant_type=client_credentials` or installed-client device grants
- Creating a new Reddit account or script app under a different user
- Printing or committing secrets

## What to tell her

- Read results: titles, permalinks, authors, and the specific ask. Do not
  dump raw listing JSON unless she wants it.
- Write results: the returned id and permalink, or the API error.
- Auth missing: say the script app is not configured and what she needs to
  create at /prefs/apps. Do not invent a workaround.
