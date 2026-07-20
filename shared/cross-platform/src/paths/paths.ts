import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import envPaths from "env-paths";

/**
 * Root under which a plugin's runtime state/cache lives, per host.
 *
 * Claude (no `OGHAM_HOST` marker) keeps `CLAUDE_CONFIG_DIR ?? ~/.claude` exactly as
 * before — Claude paths do not change. Codex gets its own `CODEX_HOME ?? ~/.codex`.
 * agy and unrecognised markers stay on the Claude channel (unmeasured — conservative).
 *
 * The `OGHAM_HOST` read is inlined rather than importing `detectHost` from `../hostPaths`,
 * which already depends on this module (importing back would cycle). Only MCP-context
 * callers carry the marker; hooks get no `OGHAM_HOST`, so hook-written state stays on the
 * Claude channel — a structural limit noted in
 * `.metadata/plugin-compiler/c4-3-state-directory.md`.
 */
function stateRoot(): string {
  if (process.env.OGHAM_HOST === "codex")
    return process.env.CODEX_HOME ?? join(homedir(), ".codex");
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
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
