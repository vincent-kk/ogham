import { env } from "../env/env.js";

interface HintEntry {
  windows?: string;
  mac?: string;
  linux?: string;
  link: string;
}

const HINTS: Record<string, HintEntry> = {
  node: {
    windows: "winget install OpenJS.NodeJS",
    mac: "brew install node",
    linux: "see your distro package manager",
    link: "https://nodejs.org/",
  },
  git: {
    windows: "winget install Git.Git",
    mac: "xcode-select --install",
    linux: "apt install git / dnf install git",
    link: "https://git-scm.com/downloads",
  },
  codex: {
    windows: "npm i -g @openai/codex",
    mac: "npm i -g @openai/codex",
    linux: "npm i -g @openai/codex",
    link: "https://www.npmjs.com/package/@openai/codex",
  },
  gemini: {
    windows: "npm i -g @google/gemini-cli",
    mac: "npm i -g @google/gemini-cli",
    linux: "npm i -g @google/gemini-cli",
    link: "https://www.npmjs.com/package/@google/gemini-cli",
  },
  npm: {
    windows: "winget install OpenJS.NodeJS",
    mac: "brew install node",
    linux: "see your distro package manager",
    link: "https://nodejs.org/",
  },
};

export function installHints(bin: string): string | undefined {
  const entry = HINTS[bin];
  if (!entry) return undefined;
  const cmd = env.isWindows
    ? entry.windows
    : env.isMacOS
      ? entry.mac
      : entry.linux;
  return cmd ? `${cmd}\n→ ${entry.link}` : `→ ${entry.link}`;
}
