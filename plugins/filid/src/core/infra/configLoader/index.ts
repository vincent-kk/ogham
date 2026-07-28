export {
  AllowedPeerOverrideSchema,
  FilidConfigSchema,
  RuleOverrideSchema,
} from './loaders/configSchemas.js';
export type {
  AllowedPeerOverride,
  FilidConfig,
} from './loaders/configSchemas.js';
export type {
  ConfigDiagnostic,
  ConfigMigrationResult,
  ConfigPatchIssue,
  ConfigPatchValidation,
  InitProjectOptions,
  InitResult,
  LoadConfigResult,
} from './loaders/configTypes.js';
export { createDefaultConfig } from './loaders/createDefaultConfig.js';
export { initProject } from './loaders/initProject.js';
export { loadConfig } from './loaders/loadConfig.js';
export { loadConfigScope } from './loaders/loadConfigScope.js';
export { migrateConfigV1 } from './loaders/migrateConfigV1.js';
export { loadRuleOverrides } from './loaders/loadRuleOverrides.js';
export { resolveLanguage } from './loaders/resolveLanguage.js';
export { resolveMaxDepth } from './loaders/resolveMaxDepth.js';
export { validateConfigPatch } from './loaders/validateConfigPatch.js';
export { writeConfig } from './loaders/writeConfig.js';

export type {
  RetiredScopeReport,
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
