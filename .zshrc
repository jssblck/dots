# Zsh configuration - mirrors fish setup
# Shared configs are in ~/.config/shell/

# Completion system
autoload -U +X compinit && compinit

# Source shared configuration files
source "$HOME/.config/shell/env.sh"
source "$HOME/.config/shell/path.sh"
source "$HOME/.config/shell/aliases.sh"

# Zsh-specific aliases
alias zrl='source ~/.zshenv && source ~/.zshrc'

# GPG key for Attune (dynamic lookup)
export ATTUNE_GPG_KEY_ID="$(gpg --list-keys --fingerprint --with-colons 2>/dev/null | awk -F: '/^fpr:/ {print $10; exit}')"

# Initialize tools (same as fish)
eval "$(/opt/homebrew/bin/brew shellenv)"
eval "$(mise activate zsh)"
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"
eval "$(direnv hook zsh)"
eval "$(lacy init zsh)"
eval "$(wtp shell-init zsh)"

# VSCode shell integration
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path zsh)"


[[ "$TERM_PROGRAM" == "kiro" ]] && . "$(kiro --locate-shell-integration-path zsh)"
