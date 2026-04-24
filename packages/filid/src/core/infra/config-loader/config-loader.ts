/**
 * @file config-loader.ts
 * @description Facade — re-exports all public symbols from loaders/ and utils/.
 *
 * loaders/: .filid/config.json I/O, project initialisation, rule docs sync.
 * utils/: resolve-plugin-root (public), other helpers are internal-only.
 */
export {
  AllowedEntrySchema,
  FilidConfigSchema,
  RuleOverrideSchema,
} from './loaders/config-schemas.js';
export type { AllowedEntry, FilidConfig } from './loaders/config-schemas.js';
export type {
  ConfigPatchIssue,
  ConfigPatchValidation,
  InitResult,
  LoadConfigResult,
} from './loaders/config-types.js';
export { createDefaultConfig } from './loaders/create-default-config.js';
export { initProject } from './loaders/init-project.js';
export { loadConfig } from './loaders/load-config.js';
export { loadRuleOverrides } from './loaders/load-rule-overrides.js';
export { resolveLanguage } from './loaders/resolve-language.js';
export { resolveMaxDepth } from './loaders/resolve-max-depth.js';
export { validateConfigPatch } from './loaders/validate-config-patch.js';
export { writeConfig } from './loaders/write-config.js';

export type {
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocSyncResult,
  RuleDocsManifest,
  RuleDocsStatus,
  SyncRuleDocsOptions,
} from './loaders/manifest-types.js';
export { getRuleDocsStatus } from './loaders/get-rule-docs-status.js';
export { loadRuleDocsManifest } from './loaders/load-rule-docs-manifest.js';
export { syncRuleDocs } from './loaders/sync-rule-docs.js';

export { resolvePluginRoot } from './utils/resolve-plugin-root.js';
