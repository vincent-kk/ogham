import { homedir } from "node:os";

export const env = {
  home(): string {
    return process.env.HOME ?? process.env.USERPROFILE ?? homedir();
  },
  get isWindows(): boolean {
    return process.platform === "win32";
  },
  get isMacOS(): boolean {
    return process.platform === "darwin";
  },
  get isLinux(): boolean {
    return process.platform === "linux";
  },
  get pathDelimiter(): ":" | ";" {
    return process.platform === "win32" ? ";" : ":";
  },
  get eol(): "\n" | "\r\n" {
    return process.platform === "win32" ? "\r\n" : "\n";
  },
};
