export {
  hasPromptContext,
  readPromptContext,
  writePromptContext,
} from './caches/promptContextCache.js';
export {
  cwdHash,
  getCacheDir,
  getPluginRoot,
  isFirstInSession,
  isPruneDue,
  isSessionPruneDue,
  markPruneRun,
  markSessionInjected,
  markSessionPruneRun,
  pruneOldSessions,
  pruneStaleCacheDirs,
  removeSessionFiles,
  sessionIdHash,
} from './caches/sessionCache.js';
export {
  readBoundary,
  writeBoundary,
} from './caches/boundaryCache.js';
export {
  commitVisit,
  fcaMapPath,
  readFractalMap,
  removeFractalMap,
} from './caches/fractalMapCache.js';
export type {
  DeliveredState,
  FractalMap,
  VisitArgs,
  VisitDecision,
  VisitScope,
} from './caches/fractalMapCache.js';
export {
  readDelivered,
} from './caches/deliveredCache.js';
export {
  incrementTurn,
  readTurn,
} from './caches/turnCounter.js';
export {
  getLastRunHash,
  saveRunHash,
} from './caches/runHashCache.js';
export {
  hasGuideInjected,
  markGuideInjected,
} from './caches/guideCache.js';
