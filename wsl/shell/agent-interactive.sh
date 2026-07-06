# Interactive shell polish for the WSL agent host.
if [ -n "${AGENT_INTERACTIVE_LOADED:-}" ]; then
    return 0 2>/dev/null || exit 0
fi
export AGENT_INTERACTIVE_LOADED=1

alias ls='eza --group-directories-first --icons=never'
alias ll='eza -la --git --group-directories-first --icons=never'
alias la='eza -a --git --group-directories-first --icons=never'
alias l='eza -l --git --group-directories-first --icons=never'
alias tree='eza --tree --git-ignore --group-directories-first --icons=never'
alias jq='jaq'
alias top='btm'

if command -v zoxide >/dev/null 2>&1; then
    eval "$(zoxide init bash)"
fi
if command -v direnv >/dev/null 2>&1; then
    eval "$(direnv hook bash)"
fi
if command -v starship >/dev/null 2>&1; then
    eval "$(starship init bash)"
fi
