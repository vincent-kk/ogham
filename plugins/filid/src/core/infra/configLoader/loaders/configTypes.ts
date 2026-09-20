import type { AnalysisAxis } from '../../../../types/fractal.js';

import type { FilidConfig } from './configSchemas.js';

/** Result of initProject. */
export interface InitResult {
  configCreated: boolean;
  /** Whether an existing v1 config was converted to v2 and written. */
  configMigrated: boolean;
  filePath: {
    config: string;
  };
}

/**
 * Result of `loadConfig` — the config itself plus any structural warnings
 * raised during zod parsing or waiver sanitisation. Consumers that want to
 * surface warnings (e.g. MCP `configWarnings` field) destructure both;
 * consumers that only care about the config ignore `warnings`.
 */
export interface LoadConfigResult {
  config: FilidConfig | null;
  warnings: ConfigWarning[];
  diagnostics: ConfigDiagnostic[];
}

/** One config entry the loader skipped, with where it sat. */
export interface ConfigWarning {
  message: string;
  /**
   * Config path of the dropped entry, e.g. `['rules', 'zero-peer-file', 'exempt']`;
   * `null` when a layer could not be read or the whole config fell back to defaults.
   */
  key: readonly (string | number)[] | null;
}

export interface ConfigDiagnostic {
  code:
    'config-migration-required' | 'config-key-discarded' | 'unknown-adapter-id';
  message: string;
  path?: string;
  /** Axes whose conclusions this diagnostic can change; `[]` means none. */
  affects: readonly AnalysisAxis[];
  /** What the caller does next; carried into the tool diagnostic unchanged. */
  nextAction: string;
}

export interface ConfigMigrationResult {
  config: FilidConfig;
  diagnostics: ConfigDiagnostic[];
}

export interface InitProjectOptions {
  language?: string;
  adapterIds?: string[];
}

/** Single validation error returned by `validateConfigPatch`. */
export interface ConfigPatchIssue {
  path: string;
  message: string;
}

/**
 * Result of validating a prospective `.filid/config.json` patch string.
 * `suggestion` is the sanitised JSON (2-space indent) that would pass strict
 * validation — present only when the sanitize pipeline recovered a valid
 * config from the original patch.
 */
export interface ConfigPatchValidation {
  valid: boolean;
  errors: ConfigPatchIssue[];
  suggestion?: string;
}
