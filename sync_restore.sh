#!/usr/bin/env zsh

ROOT=$(pwd)
mkdir .backup 2> /dev/null
cd .backup

NOW=$(date +'%Y-%m-%dT%H:%M:%S%z')
mkdir $NOW
cd $NOW

$ROOT/sync_backup.sh
echo "current config backed up to $(pwd)"
echo "contents:"
exa -Ta

cd $ROOT
cp .zshrc ~
cp .zshenv ~
cp .gtkrc-2.0 ~

mkdir ~/Pictures 2> /dev/null
cp -r Pictures/Wallpaper-Bank ~/Pictures

mkdir ~/.config 2> /dev/null
cp -r .config/hypr ~/.config
cp -r .config/kitty ~/.config
cp -r .config/waybar ~/.config
cp -r .config/waypaper ~/.config
cp -r .config/xsettingsd ~/.config
cp -r .config/nwg-look ~/.config
cp -r .config/gtk-3.0 ~/.config
