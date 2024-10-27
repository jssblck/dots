autoload -U compinit; compinit

PS1='; '

alias ll='exa -l --git -b'
alias ls='exa'
alias lt='exa -T'
alias zrl='source ~/.zshenv && source ~/.zshrc'
alias ..='cd .. && pwd'

source <(fzf --zsh)
eval "$(zoxide init zsh)"

bindkey '^[[H' beginning-of-line
bindkey '^[[F' end-of-line
bindkey '^[[1;5D' backward-word
bindkey '^[[1;5C' forward-word
bindkey '^H' kill-line
bindkey '^K' clear-screen
