
export EDITOR=`which vim`

export VOLTA_HOME="$HOME/.volta"
export PATH="$HOME/go/bin:$PATH"
export PATH="$HOME/.ghcup/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$VOLTA_HOME/bin:$PATH"
export PATH="$HOME/tools:$PATH"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

export LDFLAGS="-L/opt/homebrew/opt/libpq/lib"
export CPPFLAGS="-I/opt/homebrew/opt/libpq/include"

HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt appendhistory

. "$HOME/.cargo/env"
