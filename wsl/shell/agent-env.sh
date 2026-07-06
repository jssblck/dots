# Shared environment for login shells, SSH sessions, and agent-launched commands.
export NPM_CONFIG_PREFIX="$HOME/.local/share/npm"
export GOPATH="$HOME/go"

agent_set_path() {
    local managed cleaned dir existing old_ifs
    managed=""
    for dir in \
        "$HOME/.local/bin" \
        "$HOME/.local/share/npm/bin" \
        "$HOME/.cargo/bin" \
        "$HOME/.bun/bin" \
        "$HOME/go/bin" \
        "$HOME/.config/varlock/bin"; do
        [ -d "$dir" ] || continue
        managed="${managed:+$managed:}$dir"
    done

    cleaned=""
    old_ifs=$IFS
    IFS=:
    for existing in $PATH; do
        [ -n "$existing" ] || continue
        case ":$managed:$cleaned:" in
            *":$existing:"*) ;;
            *) cleaned="${cleaned:+$cleaned:}$existing" ;;
        esac
    done
    IFS=$old_ifs

    if [ -n "$managed" ] && [ -n "$cleaned" ]; then
        PATH="$managed:$cleaned"
    else
        PATH="$managed$cleaned"
    fi
}

agent_set_path
export PATH
unset -f agent_set_path
