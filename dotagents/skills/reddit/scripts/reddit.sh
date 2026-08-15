#!/usr/bin/env bash
set -euo pipefail

CREDENTIALS_FILE="${REDDIT_CREDENTIALS:-$HOME/.reddit/credentials}"
TOKEN_FILE="${REDDIT_TOKEN_FILE:-$HOME/.reddit/token.json}"
TOKEN_URL="https://www.reddit.com/api/v1/access_token"
API_URL="https://oauth.reddit.com"

die() { echo "error: $1" >&2; exit 1; }

usage() {
  cat <<'USAGE'
Usage: reddit.sh <command> [args]

Read:
  me
  inbox [--after NAME]
  unread [--after NAME]
  mentions [--after NAME]
  listing [subreddit] [hot|new|rising|top|controversial] [--after NAME]
  search <query> [subreddit] [--after NAME]
  thread <id-or-url>

Write (requires --confirm-write; only when Jess explicitly asked):
  comment <parent_fullname> <text>
  submit <subreddit> <title> <url-or-selftext>
  vote <fullname> <up|down|clear>
  message <username> <subject> <text>
USAGE
  exit 1
}

need_bins() {
  command -v jq >/dev/null || die "jq is required"
  command -v curl >/dev/null || die "curl is required"
}

load_credentials() {
  [[ -f "$CREDENTIALS_FILE" ]] || die "missing $CREDENTIALS_FILE; create a script app at https://www.reddit.com/prefs/apps and write client_id, client_secret, username, password"
  CLIENT_ID=""; CLIENT_SECRET=""; USERNAME=""; PASSWORD=""; USER_AGENT=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    key=${line%%=*}
    val=${line#*=}
    case "$key" in
      client_id) CLIENT_ID=$val ;;
      client_secret) CLIENT_SECRET=$val ;;
      username) USERNAME=$val ;;
      password) PASSWORD=$val ;;
      user_agent) USER_AGENT=$val ;;
    esac
  done < "$CREDENTIALS_FILE"
  [[ -n "$CLIENT_ID" && -n "$CLIENT_SECRET" && -n "$USERNAME" && -n "$PASSWORD" ]] \
    || die "credentials must set client_id, client_secret, username, password"
  [[ -n "$USER_AGENT" ]] || USER_AGENT="linux:jess-dots-reddit:1.0 (by /u/${USERNAME})"
}

token_valid() {
  [[ -f "$TOKEN_FILE" ]] || return 1
  local exp name now
  exp=$(jq -r '.expires_at // 0' "$TOKEN_FILE" 2>/dev/null || echo 0)
  name=$(jq -r '.username // empty' "$TOKEN_FILE" 2>/dev/null || true)
  [[ "$name" == "$USERNAME" ]] || return 1
  now=$(date +%s)
  [[ "$exp" -gt $((now + 60)) ]]
}

request_token() {
  local body err token expires
  body=$(curl -sS -X POST "$TOKEN_URL" \
    -u "${CLIENT_ID}:${CLIENT_SECRET}" \
    -A "$USER_AGENT" \
    -H "content-type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "username=${USERNAME}" \
    --data-urlencode "password=${PASSWORD}")
  err=$(echo "$body" | jq -r '.error // empty')
  [[ -z "$err" ]] || die "token request failed: $err"
  token=$(echo "$body" | jq -r '.access_token // empty')
  [[ -n "$token" ]] || die "token request returned no access_token"
  expires=$(echo "$body" | jq -r '.expires_in // 3600')
  mkdir -p "$(dirname "$TOKEN_FILE")"
  jq -n --arg t "$token" --arg u "$USERNAME" --argjson e "$expires" \
    '{access_token:$t, username:$u, expires_at: (now + $e | floor)}' > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
}

ensure_token() {
  load_credentials
  if ! token_valid; then
    request_token
  fi
  ACCESS_TOKEN=$(jq -r '.access_token' "$TOKEN_FILE")
}

api() {
  local method=$1 path=$2
  shift 2
  local bodyf hdrf code remaining reset retry
  bodyf=$(mktemp)
  hdrf=$(mktemp)
  code=$(curl -sS -D "$hdrf" -o "$bodyf" -w "%{http_code}" -X "$method" "${API_URL}${path}" \
    -H "Authorization: bearer ${ACCESS_TOKEN}" \
    -A "$USER_AGENT" \
    "$@")
  remaining=$(awk 'BEGIN{IGNORECASE=1} /^x-ratelimit-remaining:/ {print $2}' "$hdrf" | tr -d '\r')
  reset=$(awk 'BEGIN{IGNORECASE=1} /^x-ratelimit-reset:/ {print $2}' "$hdrf" | tr -d '\r')
  retry=$(awk 'BEGIN{IGNORECASE=1} /^retry-after:/ {print $2}' "$hdrf" | tr -d '\r')
  if [[ -n "${remaining:-}" ]]; then
    echo "ratelimit.remaining=${remaining} ratelimit.reset=${reset:-}" >&2
  fi
  if [[ "$code" == "429" ]]; then
    echo "error: rate limited (429) retry_after=${retry:-$reset}" >&2
    cat "$bodyf" >&2
    rm -f "$bodyf" "$hdrf"
    exit 2
  fi
  if [[ "$code" != "200" && "$code" != "201" ]]; then
    echo "error: HTTP $code" >&2
    cat "$bodyf" >&2
    rm -f "$bodyf" "$hdrf"
    exit 1
  fi
  cat "$bodyf"
  rm -f "$bodyf" "$hdrf"
}

api_get() { api GET "$1"; }
api_post() {
  local path=$1
  shift
  api POST "$path" -H "content-type: application/x-www-form-urlencoded" "$@"
}

verify_me() {
  local me name want got
  me=$(api_get /api/v1/me)
  name=$(echo "$me" | jq -r '.name // empty')
  want=$(printf '%s' "$USERNAME" | tr '[:upper:]' '[:lower:]')
  got=$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')
  [[ "$got" == "$want" ]] || die "logged in as ${name:-unknown}, expected $USERNAME"
  echo "$me"
}

listing_path() {
  local sub=${1:-}
  local sort=${2:-hot}
  case "$sort" in
    hot|new|rising|top|controversial) ;;
    *) die "unknown sort: $sort" ;;
  esac
  if [[ -n "$sub" ]]; then
    echo "/r/${sub}/${sort}"
  else
    echo "/${sort}"
  fi
}

thread_id() {
  local raw=$1
  if [[ "$raw" =~ t3_([a-z0-9]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  if [[ "$raw" =~ reddit\.com/r/[^/]+/comments/([a-z0-9]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  if [[ "$raw" =~ ^[a-z0-9]{5,8}$ ]]; then
    echo "$raw"
    return
  fi
  die "could not parse thread id from: $raw"
}

AFTER=""
CONFIRM_WRITE=0
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --after) AFTER=$2; shift 2 ;;
    --confirm-write) CONFIRM_WRITE=1; shift ;;
    -h|--help) usage ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
[[ $# -ge 1 ]] || usage

need_bins
ensure_token

after_qs() {
  if [[ -n "$AFTER" ]]; then
    echo "?after=${AFTER}&limit=25"
  else
    echo "?limit=25"
  fi
}

cmd=$1
shift || true

case "$cmd" in
  me)
    verify_me
    ;;
  inbox)
    api_get "/message/inbox$(after_qs)"
    ;;
  unread)
    api_get "/message/unread$(after_qs)"
    ;;
  mentions)
    api_get "/message/mentions$(after_qs)"
    ;;
  listing)
    api_get "$(listing_path "${1:-}" "${2:-hot}")$(after_qs)"
    ;;
  search)
    [[ $# -ge 1 ]] || die "search requires a query"
    q=$1
    sub=${2:-}
    encoded=$(jq -rn --arg q "$q" '$q|@uri')
    if [[ -n "$sub" ]]; then
      qs="?q=${encoded}&limit=25&restrict_sr=on"
      [[ -n "$AFTER" ]] && qs="${qs}&after=${AFTER}"
      api_get "/r/${sub}/search${qs}"
    else
      qs="?q=${encoded}&limit=25"
      [[ -n "$AFTER" ]] && qs="${qs}&after=${AFTER}"
      api_get "/search${qs}"
    fi
    ;;
  thread)
    [[ $# -ge 1 ]] || die "thread requires an id or url"
    api_get "/comments/$(thread_id "$1")?limit=100"
    ;;
  comment|submit|vote|message)
    [[ "$CONFIRM_WRITE" -eq 1 ]] || die "write requires --confirm-write and an explicit ask from Jess"
    case "$cmd" in
      comment)
        [[ $# -ge 2 ]] || die "comment <parent_fullname> <text>"
        api_post /api/comment --data-urlencode "api_type=json" \
          --data-urlencode "thing_id=$1" --data-urlencode "text=$2"
        ;;
      submit)
        [[ $# -ge 3 ]] || die "submit <subreddit> <title> <url-or-selftext>"
        sr=$1; title=$2; body=$3
        if [[ "$body" == http://* || "$body" == https://* ]]; then
          api_post /api/submit --data-urlencode "api_type=json" \
            --data-urlencode "sr=$sr" --data-urlencode "kind=link" \
            --data-urlencode "title=$title" --data-urlencode "url=$body"
        else
          api_post /api/submit --data-urlencode "api_type=json" \
            --data-urlencode "sr=$sr" --data-urlencode "kind=self" \
            --data-urlencode "title=$title" --data-urlencode "text=$body"
        fi
        ;;
      vote)
        [[ $# -ge 2 ]] || die "vote <fullname> <up|down|clear>"
        case "$2" in
          up) dir=1 ;;
          down) dir=-1 ;;
          clear) dir=0 ;;
          *) die "vote dir must be up, down, or clear" ;;
        esac
        api_post /api/vote --data-urlencode "id=$1" --data-urlencode "dir=$dir"
        ;;
      message)
        [[ $# -ge 3 ]] || die "message <username> <subject> <text>"
        api_post /api/compose --data-urlencode "api_type=json" \
          --data-urlencode "to=$1" --data-urlencode "subject=$2" \
          --data-urlencode "text=$3"
        ;;
    esac
    ;;
  *)
    usage
    ;;
esac
