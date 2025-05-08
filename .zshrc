
autoload -U compinit; compinit

PS1='; '

alias ll='eza -l --git -b'
alias ls='eza'
alias lt='eza -T'
alias zrl='source ~/.zshenv && source ~/.zshrc'
alias ..='cd .. && pwd'
alias ntr='cargo nextest run'
alias ntrl='RUST_LOG=info ntr --no-capture'
alias ntrd='RUST_LOG=debug ntr --no-capture'
alias ntrlt='RUST_LOG=trace ntr --no-capture'
alias ps='procs'
alias pq='psql -h localhost' # docker pull postgres && docker run --network=host --name postgres-latest -e POSTGRES_USER=jess -e POSTGRES_PASSWORD=123 -d --restart=always postgres
alias jq='jaq'
alias gc='git clone'
alias dotenv='set -o allexport; source .env; set +o allexport'
alias codex='\codex -m gpt-4.1-mini'
alias updatecodex='npm install -g @openai/codex'
alias updateclaude='npm install -g @anthropic-ai/claude-code'

HISTFILE=~/.zsh_history
HISTSIZE=100000
SAVEHIST=100000

setopt inc_append_history_time
setopt share_history
setopt hist_ignore_all_dups
setopt hist_reduce_blanks

source <(fzf --zsh)
source <(volta completions zsh)
source <(op completion zsh)
source <(procs --gen-completion-out zsh)
source <(rustup completions zsh)
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"

bindkey -e
bindkey "^[[3~" delete-char

# Not needed in Ghostty
# bindkey '^[[H' beginning-of-line
# bindkey '^[[F' end-of-line
# bindkey '^[[1;5D' backward-word
# bindkey '^[[1;5C' forward-word
# bindkey '^[[3~' delete-char
# bindkey '^H' kill-line
# bindkey '^K' clear-screen

