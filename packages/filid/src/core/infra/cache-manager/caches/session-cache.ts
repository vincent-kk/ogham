/**
 * @file session-cache.ts
 * @description Facade — re-exports the per-function session-cache files.
 *
 * Kept so existing importers (cache-manager.ts facade, sibling caches/*.ts)
 * continue to reference `./session-cache.js` unchanged.
 */
export { cwdHash } from './cwd-hash.js';
export { getCacheDir } from './get-cache-dir.js';
export { getPluginRoot } from './get-plugin-root.js';
export { isFirstInSession } from './is-first-in-session.js';
export { isPruneDue } from './is-prune-due.js';
export { isSessionPruneDue } from './is-session-prune-due.js';
export { markPruneRun } from './mark-prune-run.js';
export { markSessionInjected } from './mark-session-injected.js';
export { markSessionPruneRun } from './mark-session-prune-run.js';
export { pruneOldSessions } from './prune-old-sessions.js';
export { pruneStaleCacheDirs } from './prune-stale-cache-dirs.js';
export { removeSessionFiles } from './remove-session-files.js';
export { sessionIdHash } from './session-id-hash.js';
