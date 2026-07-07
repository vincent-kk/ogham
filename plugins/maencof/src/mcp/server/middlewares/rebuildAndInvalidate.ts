/**
 * @file rebuildAndInvalidate.ts
 * @description Synchronous index (re)build that invalidates the in-memory graph
 * cache on success, so the next read reloads the freshly built graph from disk.
 * Used by the explicit kg_build registration; backgroundRebuild applies the same
 * contract inline for its fire-and-forget path.
 */
import { handleKgBuild } from '../../tools/kgBuild/index.js';
import type { KgBuildInput, KgBuildResult } from '../../tools/kgBuild/index.js';
import { invalidateCache } from '../graphCache/index.js';

import { refreshTurnContextSafe } from './refreshTurnContext.js';

/**
 * Runs handleKgBuild and, on success, invalidates the graph cache so the next
 * read reloads from disk. handleKgBuild persists to disk only — without this the
 * cache keeps serving the pre-build graph to same-session reads (e.g. kg_status).
 * The hook-injected turn-context snapshot follows the same contract — it
 * summarizes the disk index, so it is rebuilt right after a successful build.
 */
export async function rebuildAndInvalidate(
  vaultPath: string,
  input: KgBuildInput,
): Promise<KgBuildResult> {
  const result = await handleKgBuild(vaultPath, input);
  if (result.success) {
    invalidateCache();
    refreshTurnContextSafe(vaultPath);
  }
  return result;
}
