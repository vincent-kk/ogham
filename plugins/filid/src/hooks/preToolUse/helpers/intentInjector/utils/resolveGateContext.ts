import { normalize, portableRelative } from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../../../constants/pathMarkers.js';
import { isDetailMd } from '../../../../shared/utils/isDetailMd.js';
import { isIntentMd } from '../../../../shared/utils/isIntentMd.js';

import { resolveOwnerIntent } from './resolveOwnerIntent.js';
import { visitKey } from './visitKey.js';

/** Owner resolution and gate inputs for one visit, consumed by commitVisit and the output builders. */
export interface GateContext {
  /** Absolute directory of the owning fractal; fileDir when no INTENT.md governs the file. */
  ownerDir: string;
  /** Composite delivery key of the owner; null when there is nothing to deliver. */
  ownerKey: string | null;
  /** ownerDir relative to the boundary (`.` for the boundary itself) — the gate label and key suffix. */
  ownerRelDir: string;
  /** True when an undelivered owner must deny this mutation once. */
  gateEligible: boolean;
  /** The call targets an INTENT.md itself: delivery is stamped, no ctx or guide is emitted. */
  selfDelivery: boolean;
}

/**
 * Resolve the owner fractal and the gate-eligibility of this visit: whether
 * the call targets an INTENT.md itself (self-delivery), the owner's delivery
 * key, and whether an undelivered mutation must gate-deny.
 * @param filePath Absolute path of the visited file.
 * @param fileDir Absolute parent directory of filePath.
 * @param chain Ancestor directories from fileDir up to the boundary.
 * @param intents INTENT.md presence per chain directory.
 * @param boundary Package boundary directory the visit keys are relative to.
 * @param readKey Composite visit key of fileDir.
 * @param mutation True for Write and Edit.
 * @returns Owner location, delivery key and the gate inputs commitVisit needs.
 */
export function resolveGateContext(
  filePath: string,
  fileDir: string,
  chain: string[],
  intents: Map<string, boolean>,
  boundary: string,
  readKey: string,
  mutation: boolean,
): GateContext {
  // Any tool aimed at an INTENT.md delivers that module by construction: a
  // Read returns the rules, a Write or Edit authors them.
  const selfDelivery = isIntentMd(filePath);
  const { hasOwner, ownerDir } = resolveOwnerIntent(fileDir, chain, intents);
  const ownerRelDir =
    normalize(portableRelative(boundary, ownerDir)) ||
    PORTABLE_PATH_MARKERS.CURRENT;
  // Self-delivery keys on the directory being documented, whether or not its
  // INTENT.md existed on disk before this call.
  const ownerKey = selfDelivery
    ? readKey
    : hasOwner
      ? visitKey(boundary, ownerRelDir)
      : null;

  const docTarget = selfDelivery || isDetailMd(filePath);
  const gateEligible = mutation && hasOwner && !docTarget;

  return { ownerDir, ownerKey, ownerRelDir, gateEligible, selfDelivery };
}
