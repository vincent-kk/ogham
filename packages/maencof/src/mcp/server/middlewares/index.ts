export { ensureFreshGraphNonBlocking } from './freshness-guard.js';
export { triggerBackgroundRebuild } from './background-rebuild.js';
export { mergeStaleNodesIntoGraph } from './partial-reindex.js';
export { runMutateSideEffects } from './mutate-side-effects.js';
export { incrementUsageStat } from './usage-stats.js';
export { walkVaultForExternalChanges } from './vault-walk.js';
export {
  registerMutateTool,
  registerReadTool,
} from './register-with-side-effects.js';
export type {
  AffectedPath,
  FreshReadHandler,
  GetAffectedPath,
  MutateCoreHandler,
  PlainReadHandler,
  ReadOptionsFresh,
  ReadOptionsPlain,
  ToolMeta,
} from './register-with-side-effects.js';
