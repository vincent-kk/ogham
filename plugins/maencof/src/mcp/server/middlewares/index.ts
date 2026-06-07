export { ensureFreshGraphNonBlocking } from './freshnessGuard.js';
export { triggerBackgroundRebuild } from './backgroundRebuild.js';
export { mergeStaleNodesIntoGraph } from './partialReindex.js';
export { runMutateSideEffects } from './mutateSideEffects.js';
export { incrementUsageStat } from './usageStats.js';
export { walkVaultForExternalChanges } from './vaultWalk.js';
export {
  registerMutateTool,
  registerReadTool,
} from './registerWithSideEffects.js';
export type {
  AffectedPath,
  GetAffectedPath,
  ReadOptionsFresh,
  ReadOptionsPlain,
  ToolMeta,
} from './registerWithSideEffects.js';
