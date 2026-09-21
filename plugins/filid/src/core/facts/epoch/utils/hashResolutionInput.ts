import { createHash } from 'node:crypto';

import {
  canonicalizeTargetPathSync,
  portableIsAbsolute,
  portableResolve,
} from '@ogham/cross-platform';

import {
  FACTS_HASH_PREFIX,
  FACTS_RESOLUTION_INPUT_MAX_BYTES,
} from '../../../../constants/facts.js';
import { readGuardedFileSync } from '../../paths/readGuardedFileSync.js';

/**
 * Hash one resolution-input file, or report it as absent.
 *
 * The path is canonicalized before it is opened — the one rule every path filid
 * opens follows. Without it the guarded read's ancestor-symlink walk refuses any
 * path that reaches its file through a link, which is not an exotic case: a
 * project rooted under macOS `/tmp` or `/var` has a symlinked ancestor, and so
 * does every workspace dependency linked into `node_modules`. Refusing those
 * would be the worst possible failure for an epoch input — it hashes to `null`
 * permanently, so editing a manifest would stop moving the epoch and records
 * would stay `exact` on resolutions that no longer hold.
 *
 * Containment is deliberately not checked. A resolution input may sit outside
 * the project — a `tsconfig` reached through `extends` is the standing case
 * (spec §2.2) — and filid only hashes it, echoing nothing from it. What is
 * checked is that the canonical target is a plain regular file of manifest size.
 *
 * Every refusal collapses to `null`, which the epoch digest treats as "absent":
 * an input that cannot be read counts as changed relative to the epoch that
 * could read it, and its bytes never reach a response.
 *
 * @param projectRoot - Absolute project root; a relative declared path is
 * resolved against it.
 * @param declaredPath - Path as the provider declared it, or a default pattern
 * match relative to the project root.
 * @returns `sha256:<hex>` of the canonical file's bytes, or null when filid will
 * not or cannot read it.
 */
export function hashResolutionInput(
  projectRoot: string,
  declaredPath: string,
): string | null {
  const absolute = portableIsAbsolute(declaredPath)
    ? declaredPath
    : portableResolve(projectRoot, declaredPath);
  let canonical: string;
  try {
    canonical = canonicalizeTargetPathSync(projectRoot, absolute);
  } catch {
    return null;
  }
  const read = readGuardedFileSync(canonical, FACTS_RESOLUTION_INPUT_MAX_BYTES);
  if (!read.ok) return null;
  return `${FACTS_HASH_PREFIX}${createHash('sha256').update(read.bytes).digest('hex')}`;
}
