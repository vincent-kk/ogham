import { chmod, stat } from "node:fs/promises";

import {
  buildConfigScopeState,
  mergeConfigLayers,
  readConfigLayers,
  writeConfigLayer,
} from "@ogham/cross-platform/config-scope";
import type {
  ConfigLayerPaths,
  ConfigScope,
  ConfigScopeState,
} from "@ogham/cross-platform/config-scope";

import { AtlassianConfigSchema } from "../../types/index.js";
import type { AtlassianConfig } from "../../types/index.js";

import { configLayers } from "./utils/configLayers.js";
import { ensureProjectDirIgnored } from "./utils/ensureProjectDirIgnored.js";

const DEFAULT_CONFIG: AtlassianConfig = {};

/** Tighten a pre-existing file created under a permissive umask. */
async function tightenIfLoose(path: string | null): Promise<void> {
  if (path === null) return;
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // ENOENT is expected on first run.
  }
}

/**
 * The config in effect: the user layer with the project layer laid over it.
 *
 * Only the merged result is validated — a project layer holds just the keys
 * it overrides (typically `base_url` alone) and cannot satisfy the schema on
 * its own. Both layers absent is the normal first-run state.
 *
 * Defense-in-depth: both files are tightened to 0o600 if a pre-existing one
 * was created under a permissive umask before saveConfig was hardened
 * (mirrors loadCredentials in auth-manager).
 */
export async function loadConfig(
  layers: ConfigLayerPaths = configLayers(),
): Promise<AtlassianConfig> {
  await tightenIfLoose(layers.user);
  await tightenIfLoose(layers.project);

  const documents = readConfigLayers(layers);
  if (documents.user === null && documents.project === null)
    return { ...DEFAULT_CONFIG };

  return AtlassianConfigSchema.parse(
    mergeConfigLayers(documents.user, documents.project),
  );
}

/** Both layers plus the merge, for callers that show which file said what. */
export function loadConfigScope(
  layers: ConfigLayerPaths = configLayers(),
): ConfigScopeState {
  return buildConfigScopeState(layers);
}

/**
 * Write one config layer with owner-only permissions and return the state.
 *
 * Config holds base_url and username (email) — sensitive identifiers worth
 * protecting from other local users, hence 0o600 on both layers. The project
 * directory also gets an ignore file on creation, because that layer lives in
 * a working tree where `git add .` is one keystroke.
 *
 * The document is written as given: a project layer is partial by design, so
 * validation belongs to the caller, on the merged preview.
 */
export async function saveConfig(
  scope: ConfigScope,
  config: Partial<AtlassianConfig>,
  layers: ConfigLayerPaths = configLayers(),
): Promise<ConfigScopeState> {
  if (scope === "project" && layers.project !== null)
    ensureProjectDirIgnored(layers.project);

  writeConfigLayer(layers, scope, config as Record<string, unknown>, {
    fileMode: 0o600,
  });
  return buildConfigScopeState(layers);
}

/** Merge partial updates into one layer's document. Not layer merging — this
 *  is a shallow patch within a single document, validated on the way out. */
export function mergeConfig(
  existing: AtlassianConfig,
  updates: Partial<AtlassianConfig>,
): AtlassianConfig {
  return AtlassianConfigSchema.parse({ ...existing, ...updates });
}
