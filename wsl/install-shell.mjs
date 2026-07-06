#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const home = process.env.HOME;
const sourceDir = process.env.DOTS_WSL_DIR;
if (!home || !sourceDir) {
  throw new Error("HOME and DOTS_WSL_DIR are required");
}

const envBlock = `# BEGIN agent-env
if [ -f "$HOME/.config/shell/agent-env.sh" ]; then
    . "$HOME/.config/shell/agent-env.sh"
fi
# END agent-env
`;
const interactiveBlock = `# BEGIN agent-interactive
if [ -f "$HOME/.config/shell/agent-interactive.sh" ]; then
    . "$HOME/.config/shell/agent-interactive.sh"
fi
# END agent-interactive
`;

function ensureBackup(path) {
  const backup = `${path}.pre-wsl-bootstrap`;
  if (existsSync(path) && !existsSync(backup)) {
    copyFileSync(path, backup);
  }
}

function stripManaged(text) {
  return text
    .replace(/\n?# BEGIN agent-env\n[\s\S]*?# END agent-env\n?/g, "\n")
    .replace(/\n?# BEGIN agent-interactive\n[\s\S]*?# END agent-interactive\n?/g, "\n")
    .replace(/\n?# Agent toolchain paths\nexport PATH="\$HOME\/\.local\/bin:\$HOME\/\.local\/share\/npm\/bin:\$HOME\/\.cargo\/bin:\$HOME\/\.bun\/bin:\$HOME\/go\/bin:\$PATH"\nexport NPM_CONFIG_PREFIX="\$HOME\/\.local\/share\/npm"\nexport GOPATH="\$HOME\/go"\n\. "\$HOME\/\.cargo\/env"\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

mkdirSync(join(home, ".config", "shell"), { recursive: true });
copyFileSync(join(sourceDir, "shell", "agent-env.sh"), join(home, ".config", "shell", "agent-env.sh"));
copyFileSync(join(sourceDir, "shell", "agent-interactive.sh"), join(home, ".config", "shell", "agent-interactive.sh"));

const bashrc = join(home, ".bashrc");
if (!existsSync(bashrc)) writeFileSync(bashrc, "");
ensureBackup(bashrc);
let bashrcText = stripManaged(readFileSync(bashrc, "utf8"));
const marker = "# If not running interactively, don't do anything";
bashrcText = bashrcText.includes(marker)
  ? bashrcText.replace(marker, `${envBlock}\n${marker}`)
  : `${envBlock}\n${bashrcText}`;
writeFileSync(bashrc, `${bashrcText.trimEnd()}\n\n${interactiveBlock}`);

const profile = join(home, ".profile");
if (!existsSync(profile)) writeFileSync(profile, "");
ensureBackup(profile);
const profileText = stripManaged(readFileSync(profile, "utf8"));
writeFileSync(profile, `${profileText.trimEnd()}\n\n${envBlock}`);

writeFileSync(
  join(home, ".bash_profile"),
  `# Login shells read this before ~/.profile. Source both so SSH and bash -lc get the same PATH.\n[ -f "$HOME/.profile" ] && . "$HOME/.profile"\n[ -f "$HOME/.config/shell/agent-env.sh" ] && . "$HOME/.config/shell/agent-env.sh"\n`,
);
