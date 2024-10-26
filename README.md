
# jess's dots

during arch install:
1. install with kitty, wayland, hyprland, pipewire
2. native closed source nvidia drivers

dev stuff
```shell
sudo pacman -Syu \
  base-devel \
  nerd-fonts \
  git \
  openssh \
  rustup \
  jq \
  xh \
  ripgrep \
  zoxide \
  fzf
```

desktop
```shell
sudo pacman -Syu \
  hyprland \
  hyprpaper \
  hyprpolkitagent \
  hyprutils \
  waybar \
  waypaper \
  nvidia \
  nvidia-utils \
  nvidia-vaapi-driver \
  slurp \
  wf-recorder \
  grim
```

> [!NOTE]
> `hyprland` requires special setup;
> follow the steps here: https://wiki.hyprland.org/Getting-Started/Master-Tutorial/

shell convenience
```shell
sudo pacman -Syu \
  xh \
  ripgrep \
  zoxide \
  fzf \
  bat
```

theming
```shell
sudo pacman -Syu \
  nwg-look \
  gnome-themes-extra
```

