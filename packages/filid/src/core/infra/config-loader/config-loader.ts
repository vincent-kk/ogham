/**
 * @file config-loader.ts
 * @description Facade — re-exports all public symbols from loaders/ organ.
 *
 * filid-config: .filid/config.json I/O and project initialisation.
 * rule-docs-manifest: rule doc sync framework (filid-setup skill only).
 */
export {
  createDefaultConfig,
  initProject,
  loadConfig,
  loadRuleOverrides,
  resolveLanguage,
  writeConfig,
} from './loaders/filid-config.js';
export type { FilidConfig, InitResult } from './loaders/filid-config.js';

export {
  getRuleDocsStatus,
  loadRuleDocsManifest,
  resolveRuleDocSelection,
  syncRuleDocs,
} from './loaders/rule-docs-manifest.js';
export type {
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocSyncResult,
  RuleDocsManifest,
  RuleDocsStatus,
} from './loaders/rule-docs-manifest.js';
