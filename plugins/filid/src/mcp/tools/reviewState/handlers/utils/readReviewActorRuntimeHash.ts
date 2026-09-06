import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';

/** Native actor policy files whose bytes can change review behavior or isolation. */
const ACTOR_RUNTIME_PATHS = [
  'agents/review-actor.md',
  'hooks/hooks.json',
  'libs/run.cjs',
  'bridge/guard-review-actor.mjs',
  'bridge/mcp-server.cjs',
] as const;

/**
 * Fingerprint the native actor and every file that wires its isolated runtime.
 * @param pluginRoot Resolved plugin root, or null when no native runtime exists.
 * @returns Stable digest that also distinguishes missing policy files.
 */
export function readReviewActorRuntimeHash(pluginRoot: string | null): string {
  const inputs = ACTOR_RUNTIME_PATHS.map((path) => {
    if (pluginRoot === null) return [path, null];
    const absolute = resolveContainedPath(pluginRoot, path);
    assertNoSymlinkDescendantsSync(pluginRoot, absolute);
    const bytes = readUtf8FileIfExistsSync(absolute);
    return [path, bytes === null ? null : computeReviewArtifactHash(bytes)];
  });
  return computeReviewArtifactHash(JSON.stringify([1, inputs]));
}
