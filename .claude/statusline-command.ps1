#!/usr/bin/env pwsh
# Claude Code statusLine command — emulates starship's "Plain Text Symbols" preset.
# Receives JSON on stdin; outputs a single ANSI-coloured status line (no trailing newline).
#
# Rendered modules (left to right):
#   1. Directory   — bold cyan, home collapsed to ~, forward slashes,
#                    truncated to last 3 components (prefix …/ when truncated)
#   2. Git branch  — "on " plain + bold magenta: "git <branch>"
#   3. Git status  — bold red: [?!+x r >N <N = $] when dirty, omitted when clean
#   4. Context     — dim: "47.2k ctx" (tokens currently in the context window)
#   5. Cache       — bold yellow: "uncached" when idle past the prompt-cache TTL
#                    (so the next message will be sent fully uncached)
#   6. Model hint  — dim: (Claude Sonnet 4.5)

param()

# ── ANSI helpers ─────────────────────────────────────────────────────────────

$ESC        = [char]27
$RESET      = "$ESC[0m"
$BOLD_CYAN  = "$ESC[1;36m"
$BOLD_MAG   = "$ESC[1;35m"
$BOLD_RED   = "$ESC[1;31m"
$BOLD_YELL  = "$ESC[1;33m"
$DIM        = "$ESC[2m"

# ── Read stdin JSON ──────────────────────────────────────────────────────────

$json = $input | Out-String | ConvertFrom-Json

$cwd = $json.cwd
if (-not $cwd) { $cwd = $json.workspace.current_dir }

$transcript = $json.transcript_path

# ── Module 1: Directory ──────────────────────────────────────────────────────
# Collapse home, convert to forward slashes, truncate to last 3 components.

$homePath = [System.Environment]::GetFolderPath('UserProfile')

# Normalise both to forward slashes for consistent handling
$cwdFwd  = $cwd      -replace '\\', '/'
$homeFwd = $homePath -replace '\\', '/'

# Replace leading home path with ~
if ($cwdFwd.StartsWith($homeFwd, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel     = $cwdFwd.Substring($homeFwd.Length).TrimStart('/')
    $cwdFwd  = if ($rel) { "~/$rel" } else { '~' }
}

# Truncate to 3 path components (starship default truncation_length=3)
$parts = $cwdFwd.TrimStart('/') -split '/'

# Handle leading ~ as a fixed anchor that doesn't count toward the 3 components
if ($cwdFwd.StartsWith('~')) {
    # e.g. "~/a/b/c/d/e" -> parts = ["~","a","b","c","d","e"] after split
    $allParts = $cwdFwd -split '/'
    if ($allParts.Count -gt 4) {
        # more than ~/x/y/z — truncate working portion to last 3
        $tail    = $allParts[-3..-1] -join '/'
        $dirText = "…/$tail"
    } else {
        $dirText = $cwdFwd
    }
} else {
    $allParts = $cwdFwd -split '/'
    if ($allParts.Count -gt 3) {
        $tail    = $allParts[-3..-1] -join '/'
        $dirText = "…/$tail"
    } else {
        $dirText = $cwdFwd
    }
}

$dirSegment = "${BOLD_CYAN}${dirText}${RESET}"

# ── Git information ──────────────────────────────────────────────────────────

$branch    = $null
$ahead     = 0
$behind    = 0
$staged    = 0      # any staged change
$modified  = 0      # unstaged modified
$deleted   = 0      # unstaged deleted (staged or unstaged)
$renamed   = 0      # staged renamed
$untracked = 0
$stagedDel = 0      # staged deleted

try {
    # Use --porcelain=v2 so we get ahead/behind counts in one call
    $statusRaw = & git -C $cwd --no-optional-locks status --porcelain=v2 --branch 2>$null
    if ($LASTEXITCODE -eq 0 -and $statusRaw) {
        foreach ($line in $statusRaw) {
            if ($line.StartsWith('# branch.head ')) {
                $b = $line.Substring('# branch.head '.Length).Trim()
                if ($b -ne '(detached)') { $branch = $b }
            } elseif ($line.StartsWith('# branch.ab ')) {
                # format: +N -N
                if ($line -match '\+(\d+)\s+-(\d+)') {
                    $ahead  = [int]$Matches[1]
                    $behind = [int]$Matches[2]
                }
            } elseif ($line.StartsWith('# branch.oid ')) {
                # detached HEAD — try to get a short sha for display
                if (-not $branch) {
                    $sha    = ($line -split ' ')[-1]
                    $branch = $sha.Substring(0, [Math]::Min(7, $sha.Length))
                }
            } elseif ($line.StartsWith('1 ') -or $line.StartsWith('2 ')) {
                # ordinary / rename entries: "1 XY ..."  "2 XY ..."
                $xy = $line.Substring(2, 2)
                $x  = $xy[0]   # staged
                $y  = $xy[1]   # unstaged

                if ($x -ne '.' -and $x -ne ' ') {
                    if ($x -eq 'D') { $stagedDel++ }
                    elseif ($x -eq 'R') { $renamed++ }
                    else { $staged++ }
                }
                if ($y -eq 'M') { $modified++ }
                if ($y -eq 'D') { $deleted++ }
            } elseif ($line.StartsWith('? ')) {
                $untracked++
            }
        }
    }
} catch {}

# ── Module 2: Git branch ─────────────────────────────────────────────────────
# starship plain-text preset: format = "on [$symbol$branch]($style) "
# plain-text symbol = "git " (the word "git" followed by a space)
# → renders as: "on " (unstyled) + bold-magenta "git <branch>"

$branchSegment = ''
if ($branch) {
    $branchSegment = " on ${BOLD_MAG}git ${branch}${RESET}"
}

# ── Module 3: Git status ─────────────────────────────────────────────────────
# starship plain-text preset symbols (overrides from default in parentheses):
#   ?  untracked         (unchanged)
#   !  modified          (unchanged)
#   +  staged            (unchanged)
#   x  deleted           (was ✗)
#   r  renamed           (was »)
#   >N ahead by N        (was ⇡N)
#   <N behind by N       (was ⇣N)
#   <> diverged          (was ⇕)
#   =  conflicted        (unchanged)
#   $  stashed           (unchanged)
# Omit brackets entirely when tree is clean and not ahead/behind.

$statusSegment = ''
if ($branch) {
    $sym = ''
    if ($untracked -gt 0) { $sym += '?' }
    if ($modified  -gt 0) { $sym += '!' }
    if ($staged    -gt 0) { $sym += '+' }
    if ($stagedDel -gt 0 -or $deleted -gt 0) { $sym += 'x' }
    if ($renamed   -gt 0) { $sym += 'r' }
    if ($ahead -gt 0 -and $behind -gt 0) {
        $sym += '<>'
    } elseif ($ahead  -gt 0) {
        $sym += ">$ahead"
    } elseif ($behind -gt 0) {
        $sym += "<$behind"
    }

    if ($sym) {
        $statusSegment = " ${BOLD_RED}[${sym}]${RESET}"
    }
}

# ── Transcript: context size + cache staleness ───────────────────────────────
# The statusLine stdin provides `transcript_path` — a JSONL log of the session.
# From it we derive two things:
#   • Context tokens: the full prompt size of the most recent main-chain assistant
#     turn = input + cache_creation + cache_read + output. This is what currently
#     occupies the context window.
#   • Cache staleness: Anthropic's prompt cache is ephemeral. Claude Code may use a
#     5-minute or a 1-hour breakpoint; we detect which by checking whether this
#     session has ever written a 1h cache entry. If the time since the last turn
#     (transcript mtime) exceeds that TTL, every cache breakpoint is cold and the
#     next message will be sent fully uncached.

$ctxTokens = $null
$uncached  = $false

if ($transcript -and (Test-Path -LiteralPath $transcript)) {
    try {
        $tlines = @(Get-Content -LiteralPath $transcript)  # @() so a 1-line file stays an array, not a [string] we'd index char-wise

        # Effective TTL: 1h if this session uses extended (1h) caching, else 5m.
        $ttlSeconds = 300
        if (($tlines -join "`n") -match '"ephemeral_1h_input_tokens":\s*[1-9]') {
            $ttlSeconds = 3600
        }

        # Most recent main-chain assistant usage → current context occupancy.
        for ($i = $tlines.Count - 1; $i -ge 0; $i--) {
            if ($tlines[$i] -notmatch '"usage"') { continue }
            $entry = $null
            try { $entry = $tlines[$i] | ConvertFrom-Json } catch { continue }
            if ($entry.isSidechain -eq $true) { continue }   # skip subagent turns
            $u = $entry.message.usage
            if (-not $u) { continue }
            $ctxTokens = [int]$u.input_tokens +
                         [int]$u.cache_creation_input_tokens +
                         [int]$u.cache_read_input_tokens +
                         [int]$u.output_tokens
            break
        }

        # Idle past the cache TTL → next message is fully uncached.
        $mtime = (Get-Item -LiteralPath $transcript).LastWriteTime
        if (((Get-Date) - $mtime).TotalSeconds -gt $ttlSeconds) {
            $uncached = $true
        }
    } catch {}
}

# ── Module 4: Context tokens ─────────────────────────────────────────────────

$ctxSegment = ''
if ($null -ne $ctxTokens) {
    if ($ctxTokens -ge 1000000) {
        $ctxStr = '{0:0.0}M' -f ($ctxTokens / 1000000)
    } elseif ($ctxTokens -ge 1000) {
        $ctxStr = '{0:0.0}k' -f ($ctxTokens / 1000)
    } else {
        $ctxStr = "$ctxTokens"
    }
    $ctxSegment = " ${DIM}${ctxStr} ctx${RESET}"
}

# ── Module 5: Cache staleness warning ────────────────────────────────────────

$cacheSegment = ''
if ($uncached) {
    $cacheSegment = " ${BOLD_YELL}uncached${RESET}"
}

# ── Module 6: Model hint ─────────────────────────────────────────────────────

$modelSegment = ''
$model = $json.model.display_name
if ($model) {
    $modelSegment = " ${DIM}(${model})${RESET}"
}

# ── Compose and emit ─────────────────────────────────────────────────────────

# No trailing newline — Claude Code appends its own separator
[System.Console]::Write("${dirSegment}${branchSegment}${statusSegment}${ctxSegment}${cacheSegment}${modelSegment}")
