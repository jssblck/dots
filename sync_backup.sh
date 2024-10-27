#!/usr/bin/env zsh

cp ~/.zshrc .
cp ~/.zshenv .
cp ~/.gtkrc-2.0 .

rm -rf Pictures
mkdir Pictures
cp -r ~/Pictures/Wallpaper-Bank Pictures

rm -rf .config
mkdir .config
cp -r ~/.config/hypr .config
cp -r ~/.config/kitty .config
cp -r ~/.config/waybar .config
cp -r ~/.config/waypaper .config
cp -r ~/.config/xsettingsd .config
cp -r ~/.config/nwg-look .config
cp -r ~/.config/gtk-3.0 .config
