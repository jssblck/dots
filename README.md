
# jess's dots

this is mostly for self reference; it's public so that i can access it on new system startup before authenticating github etc.
sharing in case anyone finds it useful.

> [!TIP]
> standalone commands in this document assume `~` as the CWD.
> sequences of commands in code blocks assume you're starting in `~`, and then may move around in the sequence.

# installation

these sections are mostly in order, the sections are just for easy reference.
make sure the prior steps have been completed (or know that things may break).

## arch

1. boot into arch installer
1. use `archinstall` script
1. install options:
  - btrfs, auto partition, copy on write, enable compression
  - no disk encryption (https://xkcd.com/538/)
  - bootloader: systemd-boot
  - disable root
  - profile: desktop
  - greeter: sccm
  - compositor: hyprland
  - audio: pipewire
  - network: network manager
  - native closed source nvidia drivers (as of writing this installs `nvidia-dkms` but `nvidia` should be fine to)
1. additional packages during install: 
  - base-devel
  - rustup
  - zip
  - unzip
  - git
  - openssh
  - zsh
1. chroot into installation:
  - configure nvidia modules as in https://wiki.hyprland.org/Nvidia/; for posterity:
  - edit `/etc/mkinitcpio.conf`: `MODULES=(... nvidia nvidia_modeset nvidia_uvm nvidia_drm ...)`
  - edit/create `/etc/modprobe.d/nvidia.conf`: `options nvidia_drm modeset=1 fbdev=1`
  - rebuild: `sudo mkinitcpio -P`
  - exit
1. reboot into new install

## desktop

> [!TIP]
> the installer should have installed these, but if you're not sure,
> run this step after getting paru set up but before installing dots:
> `paru -Syu grim slurp hyprland`

> [!TIP]
> if you need a utility and don't know what package installs it,
> run `paru -F $FILENAME` or `paru -Fx $FILENAME` for exact searches.
>
> to list installed packages, just use `paru -Q`;
> to see if specific packages are installed use `paru -Q | rg $PACKAGE`.

1. the initial `sccm` page is ugly. just log in asap.
1. the first time running hyprland the warning about a default config is "blinking", this is because hyprland is crashing. `super+m` to exit, this kicks us back to `sccm`. log in again.
1. yay, no more blinking. remove the `autogenerated` line or whatever from the `~/.config/hypr/hyprland.conf` so it gets rid of the banner. 
1. clone dots: `git clone https://github.com/jssblck/dots.git`
1. install other tools:
  - rust: `rustup update stable`
  - paru: `mkdir tools && cd tools && git clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si && paru --gendb`
    - optional: enable colors in `/etc/pacman.conf`
  - sync paru: `paru -Syu && paru -Fy`
  - utils: `paru -S nerd-fonts jq xh ripgrep eza zoxide fzf hyprpaper hyprpolkitagent waybar waypaper wf-recorder nwg-look gnome-themes-extra wl-copy`
    - i just install all the `nerd-fonts`, follow your heart
    - if you get conflicts between `*-git` and non-git variants, generally pick the git variants
    - the main difference is that they're built from source so are more up to date
    - but as usual, use your judgement...
1. install the dots: `cp -rT dots .`
  - this copies the readme into your home directory, feel free to delete it but it may be useful for referencing later
1. switch to zsh: `chsh -s $(which zsh)`
1. copy contents of `Pictures` to `~/Pictures` for wallpapers
1. `super+q` to log out, then log back in.
1. if you want you can delete all the `.bash*` stuff from your home dir.

### dark theme

i don't use any theme switching, i just run dark mode all the time.
i also am fine with adwaita themes generally, but if you prefer other looks follow your heart.

> [!WARNING]
> sources online talk about using `xdg-desktop-portal`, i find if i do this suddenly polkit integration breaks.
> i haven't yet found a workaround for theming apps like timeshift or the polkit dialogue.

1. install themes: `paru -S nwg-look gnome-themes-extra adwaita-qt5-git adwaita-qt6-git`
2. apply themes:
  - run `nwg-look`, select dark theme
  - run `gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'`

## apps

> [!TIP] i use a lot of electron apps.
> lots of docs online talk about setting like, special launch options and whatever to make them work with wayland.
> i didn't do any of that and things seemed to work fine for me (for my needs anyway).
> but maybe if i did this section differently things would be better. i don't mind running stuff on xwayland.

> [!IMPORTANT]
> if any of these prompt to update nvidia drivers, **STOP** and be _very careful_ that you know the consequences and how to recover.
> i hosed one of my installs by blindly accepting `slack-desktop` updating the `nvidia` driver, which killed all electron apps on the system.
> personally, i just use the web version if anything fishy seems like it's going on, but as always, follow your heart.

1. install x interop stuff: `paru -S xorg-xhost`
  - you then need to execute `xorg-xhost` to allow stuff. my dotfiles add `xhost + > /dev/null` to `hyprland` startup, but this is dubiously secure.
  - if you want to be a little more secure, consider modifying your launch options for programs that need this to run `xhost +SI:localuser:root && $COMMAND`.
1. validate polkit prompts work: `pkexec echo 1`
  - this should pop up and prompt for your password, then `echo 1` to your terminal
  - if this doesn't work, you need to debug `polkit` and `hyprpolkitagent`
  - good luck

### 1password

> [!TIP]
> the 1password app sometimes crashes immediately on startup.
> if this happens, it may take a few seconds for another relaunch to work.
> i suspect this may be due to missing `xdg-desktop-portal` stuff? that's installed later, if you want.

> [!IMPORTANT]
> after getting this working, i periodically rebooted and double checked that everything related to 1password, auth, and the ssh agent worked.
> basically anything that i thought might touch those packages.
> if anything broke i immediately reverted and tried something else.

1. install: `paru -S 1password 1password-cli`
1. configure:
  - i use system authentication, the ssh agent, and 1password cli integration.
  - this relies on polkit to pop up prompts for auth.
  - this may not work at first, try rebooting. last time i was debugging it just randomly started working.
  - good luck

### firefox

1. easy: `paru -S firefox`, works out of the box.

### snapshots

> [!IMPORTANT]
> assuming you allowed `archinstall` to set up the volumes automatically, it'll have added extra information to `/etc/fstab`
> that makes restoring snapshots impossible.
>
> before setting up snapshots, backup your `/etc/fstab` and then edit it to remove the `subvolid=$ID,` directives.

timeshift is amazing for snapshotting the system. this is the main reason we use `btrfs`: it enables snapshots using a lot less space.

> [!TIP]
> i don't run grub, so can't use `grub-btrfs`, which automates booting into snapshots.
> if your system gets broken but you can still log in, you should be able to use timeshift to restore snapshots.
> if your system can boot but not log in, you should be able to use a different tty to use timeshift to restore snapshots.
> if your system can't boot at all, you should be able to use arch install media to boot and then just `chroot` into the system, then use timeshift to restore snapshots.

> [!TIP]
> i don't snapshot `@home`: everything in there is backed up other ways (generally, through git).
> feel free to snapshot `@home` if you want, it'll likely be a lot of data though.

1. install: `paru -S timeshift`
1. launch the GUI. this relies on polkit to pop up auth prompts. configure the settings as desired. i use:
  - 1 monthly snapshot
  - 1 weekly snapshot
  - 3 daily snapshots
  - use btrfs
1. take your first snapshot. comment something like "first working version".
1. change something on the system
1. restore your snapshot and note that the change you made is undone.

### discord

1. easy: `paru -S vesktop`, works out of the box.

### code

1. easy: `paru -S visual-studio-code-bin`, works out of the box.

## screen sharing

> [!WARNING]
> this can mess up your polkit` authentication, be careful and make sure to snapshot.

1. install portals: `paru -S xdg-desktop-portal-hyperland-git xdg-desktop-portal xdg-desktop-portal-gtk`
1. install pipewire: `paru -S pipewire wireplumber`
1. if using obs, install `wlrobs-hg`
1. if you want to use obs as a virtual camera (e.g. for discord screen sharing workarounds), install `paru -S v4l2loopback`
  - despite repeated attempts i've yet to get discord screen sharing to work even when running inside firefox
  - i'm hopeful this is just some sort of driver bug, or bug with the xdg portal.

