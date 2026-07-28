/**
 * @file configManager.ts
 * @description Config.json CRUD with dot-path access
 * @see skills/setup/references/init-workflow.md
 */
import {
  buildConfigScopeState,
  mergeConfigLayers,
  readConfigLayers,
  writeConfigLayer,
} from '@ogham/cross-platform/config-scope';
import type {
  ConfigScope,
  ConfigScopeState,
} from '@ogham/cross-platform/config-scope';

import { ImbasConfigSchema } from '../../types/config.js';
import type { ImbasConfig } from '../../types/config.js';
import { setNested } from '../../utils/index.js';

import { configLayers } from './utils/configLayers.js';

/**
 * The config in effect: the user layer with the project layer laid over it.
 *
 * Only the merged result is validated — a project layer holds just the keys
 * it overrides and cannot satisfy the schema alone. Both layers absent is the
 * normal first-run state and yields validated defaults.
 */
export async function loadConfig(cwd: string): Promise<ImbasConfig> {
  const documents = readConfigLayers(configLayers(cwd));
  const merged = mergeConfigLayers(documents.user, documents.project);
  return ImbasConfigSchema.parse(merged) as unknown as ImbasConfig;
}

/**
 * Both layers plus the merge, for callers that need to show which file said
 * what rather than just what is in effect.
 */
export function loadConfigScope(cwd: string): ConfigScopeState {
  return buildConfigScopeState(configLayers(cwd));
}

/**
 * Atomically write one config layer.
 *
 * The scope is required rather than defaulted: a silent default would write
 * the wrong file when a caller forgets, and both layers are equally valid
 * targets.
 */
export async function saveConfig(
  cwd: string,
  scope: ConfigScope,
  config: ImbasConfig,
): Promise<void> {
  writeConfigLayer(
    configLayers(cwd),
    scope,
    config as unknown as Record<string, unknown>,
  );
}

/**
 * Get a value from config by dot-path (e.g. "defaults.llm_model.validate").
 * Returns undefined if any segment is missing.
 */
export function getConfigValue(config: ImbasConfig, dotPath: string): unknown {
  const parts = dotPath.split('.');
  let current: unknown = config;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Return a new config with the value at dotPath replaced (immutable).
 * Creates intermediate objects as needed.
 */
export function setConfigValue(
  config: ImbasConfig,
  dotPath: string,
  value: unknown,
): ImbasConfig {
  const parts = dotPath.split('.');
  return setNested(config, parts, value) as ImbasConfig;
}

/**
 * Apply multiple dot-path updates at once (immutable).
 */
export function applyConfigUpdates(
  config: ImbasConfig,
  updates: Record<string, unknown>,
): ImbasConfig {
  let result = config;
  for (const [dotPath, value] of Object.entries(updates))
    result = setConfigValue(result, dotPath, value);

  return result;
}
