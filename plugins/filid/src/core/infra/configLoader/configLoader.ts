/**
 * @file configLoader.ts
 * @description Facade — re-exports all public symbols from loaders/ and utils/.
 *
 * loaders/: .filid/config.json I/O, project initialisation, rule docs sync.
 * utils/: resolve-plugin-root (public), other helpers are internal-only.
 */
export {
  AllowedEntrySchema,
  FilidConfigSchema,
  RuleOverrideSchema,
} from './loaders/configSchemas.js';
export type { AllowedEntry, FilidConfig } from './loaders/configSchemas.js';
export type {
  ConfigPatchIssue,
  ConfigPatchValidation,
  InitResult,
  LoadConfigResult,
} from './loaders/configTypes.js';
export { createDefaultConfig } from './loaders/createDefaultConfig.js';
export { initProject } from './loaders/initProject.js';
export { loadConfig } from './loaders/loadConfig.js';
export { loadRuleOverrides } from './loaders/loadRuleOverrides.js';
export { resolveLanguage } from './loaders/resolveLanguage.js';
export { resolveMaxDepth } from './loaders/resolveMaxDepth.js';
export { validateConfigPatch } from './loaders/validateConfigPatch.js';
export { writeConfig } from './loaders/writeConfig.js';

export type {
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocSyncResult,
  RuleDocsManifest,
  RuleDocsStatus,
  SyncRuleDocsOptions,
} from './loaders/manifestTypes.js';
export { getRuleDocsStatus } from './loaders/getRuleDocsStatus.js';
export { loadRuleDocsManifest } from './loaders/loadRuleDocsManifest.js';
export { syncRuleDocs } from './loaders/syncRuleDocs.js';

export { resolvePluginRoot } from './utils/resolvePluginRoot.js';
