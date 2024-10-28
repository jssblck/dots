
# jess's dots

this is mostly for self reference; it's public so that i can access it on new system startup before authenticating github etc.
sharing in case anyone finds it useful.

![image of my desktop with these dotfiles](./assets/desktop.png)

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

> [!TIP]
> make sure to enable git signing for your commits:
> https://blog.1password.com/git-commit-signing/
>
> make sure to set up `op` for your scripts too!
> i make scripts in `tools` that i use like `. {script_name}`
> which run `op` commands to export variables into the current session.
> for example:
> ```shell
> #!/usr/bin/env zsh
> export GITHUB_TOKEN=$(op read 'op://Private/Github Personal Access Token/password')
> ```

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

### yazi

1. easy: `paru -S yazi`; `super+f` to open.
1. optionally, install these for enhanced previews:
  - `paru -S ffmpegthumbnailer jq poppler fd ripgrep fzf wl-clipboard p7zip imagemagick bat`

### gaming

> [!WARNING]
> make sure to take a timeshift backup first, we're going to be messing with drivers a lot.

> [!IMPORTANT]
> you need to enable multilib if you haven't already in order to install basically everything in this section.

> [!INFO]
> i was always planning to install lutris _and_ steam- if you only care about one,
> you may not need all these steps.
>
> for game compatibility:
> - https://www.protondb.com/
> - https://lutris.net/
>
> generally i try to run stuff in steam if i can, and use lutris as a fallback if i can't.

1. install drivers, wine, gamemode, and required libraries:
```shell
# yes this seems like a lot but you need it all
sudo pacman -S --needed nvidia-dkms nvidia-utils lib32-nvidia-utils nvidia-settings vulkan-icd-loader lib32-vulkan-icd-loader
sudo pacman -S gamemode lib32-gamemode # make sure to add yourself to the `gamemode` group
sudo pacman -S wine-staging
sudo pacman -S --needed --asdeps giflib lib32-giflib gnutls lib32-gnutls v4l-utils lib32-v4l-utils libpulse \
lib32-libpulse alsa-plugins lib32-alsa-plugins alsa-lib lib32-alsa-lib sqlite lib32-sqlite libxcomposite \
lib32-libxcomposite ocl-icd lib32-ocl-icd libva lib32-libva gtk3 lib32-gtk3 gst-plugins-base-libs \
lib32-gst-plugins-base-libs vulkan-icd-loader lib32-vulkan-icd-loader sdl2 lib32-sdl2
```
1. install steam: `sudo pacman -S steam`
1. boot steam, sign in, go to `settings -> compatibility` and enable steam play for everything.
1. install lutris: `sudo pacman -S lutris`
1. launch lutris, log in, and turn on library sync.
1. go to settings -> system, make sure `Vulkan`, `Esync`, `Fsync`, `Wine`, `Gamemode`, and `Steam` are all "YES".
1. go to settings -> updates, make sure "Stable" is selected. click the buttons to have lutris download wine and any missing media for you.

> [!TIP]
> if fonts look bad, try `paru -S ttf-ms-fonts`

you should be good!
to run games:
- in steam, just launch steam and have it download. it should just work, check `protondb` if it doesn't.
- in lutris, click "+" in the top left corner and search. it should just work, check the lutris website if it doesn't.
  - often the installation modal will have instructions, make sure to follow them.

> [!TIP]
> press Super+G to make a game fullscreen!

## screen sharing

> [!WARNING]
> this can mess up your polkit` authentication, be careful and make sure to snapshot.

1. install portals: `paru -S xdg-desktop-portal-hyperland-git xdg-desktop-portal xdg-desktop-portal-gtk`
1. install pipewire: `paru -S pipewire wireplumber`
1. if using obs, install `wlrobs-hg`
1. if you want to use obs as a virtual camera (e.g. for discord screen sharing workarounds), install `paru -S v4l2loopback`
  - despite repeated attempts i've yet to get discord screen sharing to work even when running inside firefox
  - i'm hopeful this is just some sort of driver bug, or bug with the xdg portal.
