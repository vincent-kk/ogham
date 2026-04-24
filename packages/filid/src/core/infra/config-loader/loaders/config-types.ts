import type { FilidConfig } from './config-schemas.js';

/** Result of initProject. */
export interface InitResult {
  configCreated: boolean;
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
  warnings: string[];
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
