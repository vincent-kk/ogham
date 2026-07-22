import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import envPaths from "env-paths";

import { resolveHostDescriptor } from "../hostRegistry/resolveHostDescriptor.js";

/**
 * Root under which a plugin's runtime state/cache lives, per host.
 *
 * Which host, and where that host keeps state, are both answered by `hostRegistry`
 * — this module contributes only the `$HOME`-relative assembly. Host names and
 * host env-var names must not reappear here: an OS path helper is the last place
 * anyone would look for the list of agent hosts, and a second copy of that list is
 * a second thing to forget when a host is added.
 *
 * `hostRegistry` is imported by concrete file rather than through its barrel
 * because this module is hook-reachable (`hooks/errorLog.ts`), and esbuild would
 * pull everything a barrel re-exports into the hook bundle.
 */
function stateRoot(): string {
  const host = resolveHostDescriptor(process.env);
  return process.env[host.stateRootEnv] ?? join(homedir(), host.stateRootDir);
}

export function home(): string {
  return homedir();
}

export function tmp(): string {
  return tmpdir();
}

export function pluginCache(pkg: string, version?: string): string {
  const base = join(stateRoot(), "plugins", pkg);
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
