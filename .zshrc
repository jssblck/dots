
autoload -U compinit; compinit

PS1='; '

alias ll='exa -l --git -b'
alias ls='exa'
alias lt='exa -T'
alias zrl='source ~/.zshenv && source ~/.zshrc'
alias cat='bat'
alias ..='cd .. && pwd'
alias pq='psql -h localhost' # docker pull postgres && docker run --network=host --name postgres-latest -e POSTGRES_USER=jess -e POSTGRES_PASSWORD=123 -d --restart=always postgres
alias ntr='cargo nextest run'
alias ps='procs'
alias trash='trashy put'
alias gw='./gradlew'

source <(fzf --zsh)
source <(volta completions zsh)
source <(op completion zsh)
source <(procs --gen-completion-out zsh)
source <(trashy completions zsh)
eval "$(zoxide init zsh)"
source "$HOME/.sdkman/bin/sdkman-init.sh"

bindkey '^[[H' beginning-of-line
bindkey '^[[F' end-of-line
bindkey '^[[1;5D' backward-word
bindkey '^[[1;5C' forward-word
bindkey '^[[3~' delete-char
bindkey '^H' kill-line
bindkey '^K' clear-screen
