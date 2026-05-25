import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import envPaths from "env-paths";

function claudeRoot(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export function home(): string {
  return homedir();
}

export function tmp(): string {
  return tmpdir();
}

export function pluginCache(pkg: string, version?: string): string {
  const base = join(claudeRoot(), "plugins", pkg);
  return version ? join(base, version) : base;
}

export function normalize(p: string): string {
  return p.replace(/\\/g, "/");
}

export function configDir(scope: string): string {
  return envPaths(scope, { suffix: "" }).config;
}

export function cacheDir(scope: string): string {
  return envPaths(scope, { suffix: "" }).cache;
}

/** Object-form facade. Retained for ergonomic call sites; importing `paths`
 *  captures the env-paths dependency, so bundle-size sensitive callers (hooks)
 *  should prefer the named function exports above. */
export const paths = {
  home,
  tmp,
  configDir,
  cacheDir,
  pluginCache,
  normalize,
};
