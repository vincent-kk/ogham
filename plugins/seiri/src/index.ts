export {
  createDefaultConfig,
  loadConfig,
  resolveConfigPath,
  writeConfig,
} from './core/infra/configLoader/index.js';
export {
  applyRuleDocs,
  getRuleDocsStatus,
  loadManifest,
  planRuleDocs,
  resolveManifestPath,
  resolveRulesDir,
  resolveTemplatePath,
} from './core/ruleDocs/index.js';
export { VERSION } from './version.js';
export type {
  HookOutput,
  InstructionsLoadedInput,
  InterventionLevel,
  LoadConfigResult,
  RuleDocAction,
  RuleDocEntry,
  RuleDocOutcome,
  RuleDocStatus,
  RuleDocSyncResult,
  RuleDocsManifest,
  SeiriConfig,
  SessionStartInput,
  SyncRuleDocsOptions,
} from './types/index.js';
