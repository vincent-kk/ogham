/**
 * @file config-loader.ts
 * @description Facade — re-exports all public symbols from loaders/ organ.
 *
 * filid-config: .filid/config.json I/O and project initialisation.
 * rule-docs-manifest: rule doc sync framework (filid-setup skill only).
 */
export {
  AllowedEntrySchema,
  createDefaultConfig,
  FilidConfigSchema,
  initProject,
  loadConfig,
  loadRuleOverrides,
  resolveLanguage,
  resolveMaxDepth,
  RuleOverrideSchema,
  writeConfig,
} from './loaders/filid-config.js';
export type {
  AllowedEntry,
  FilidConfig,
  InitResult,
} from './loaders/filid-config.js';

export {
  getRuleDocsStatus,
  loadRuleDocsManifest,
  syncRuleDocs,
} from './loaders/rule-docs-manifest.js';
export { resolvePluginRoot } from './utils/resolve-plugin-root.js';
export type {
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocSyncResult,
  RuleDocsManifest,
  RuleDocsStatus,
  SyncRuleDocsOptions,
} from './loaders/rule-docs-manifest.js';
