import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import envPaths from "env-paths";

export const paths = {
  home(): string {
    return homedir();
  },
  tmp(): string {
    return tmpdir();
  },
  configDir(scope: string): string {
    return envPaths(scope, { suffix: "" }).config;
  },
  cacheDir(scope: string): string {
    return envPaths(scope, { suffix: "" }).cache;
  },
  pluginCache(pkg: string, version?: string): string {
    const base = join(homedir(), ".claude", "plugins", pkg);
    return version ? join(base, version) : base;
  },
  normalize(p: string): string {
    return p.replace(/\\/g, "/");
  },
};
