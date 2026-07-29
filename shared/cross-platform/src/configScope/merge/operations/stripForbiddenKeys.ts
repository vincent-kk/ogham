import { FORBIDDEN_KEYS } from "../utils/forbiddenKeys.js";
import { isPlainObject } from "../utils/isPlainObject.js";

/**
 * A copy of the document without the keys the merge would refuse to honour.
 *
 * Writers use this so a layer file never gains a key that is permanently
 * ignored. Without it such a key is stuck: the merge drops it, a settings
 * page only ever sends the keys it knows about, and a save that spreads the
 * stored document rewrites it — nothing on the normal path can clear it.
 *
 * Recursion matches `mergeConfigLayers` exactly: into plain objects, never
 * into arrays. An object inside an array is replaced wholesale rather than
 * assigned key by key, so no prototype setter is ever reached through one —
 * and a writer that scrubbed further would disagree with the merge about what
 * "unsafe" means.
 */
export function stripForbiddenKeys(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(document)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const value = document[key];
    safe[key] = isPlainObject(value) ? stripForbiddenKeys(value) : value;
  }
  return safe;
}
