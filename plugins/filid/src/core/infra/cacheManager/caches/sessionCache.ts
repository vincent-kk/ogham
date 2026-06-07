/**
 * @file sessionCache.ts
 * @description Facade — re-exports the per-function session-cache files.
 *
 * Kept so existing importers (cacheManager.ts facade, sibling caches/*.ts)
 * continue to reference `./sessionCache.js` unchanged.
 */
export { cwdHash } from './cwdHash.js';
export { getCacheDir } from './getCacheDir.js';
export { getPluginRoot } from './getPluginRoot.js';
export { isFirstInSession } from './isFirstInSession.js';
export { isPruneDue } from './isPruneDue.js';
export { isSessionPruneDue } from './isSessionPruneDue.js';
export { markPruneRun } from './markPruneRun.js';
export { markSessionInjected } from './markSessionInjected.js';
export { markSessionPruneRun } from './markSessionPruneRun.js';
export { pruneOldSessions } from './pruneOldSessions.js';
export { pruneStaleCacheDirs } from './pruneStaleCacheDirs.js';
export { removeSessionFiles } from './removeSessionFiles.js';
export { sessionIdHash } from './sessionIdHash.js';
