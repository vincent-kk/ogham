import { normalize, portableRelative } from '@ogham/cross-platform';

import { PORTABLE_PATH_MARKERS } from '../../../../../constants/pathMarkers.js';
import { isDetailMd } from '../../../../shared/utils/isDetailMd.js';
import { isIntentMd } from '../../../../shared/utils/isIntentMd.js';

import { resolveOwnerIntent } from './resolveOwnerIntent.js';
import { visitKey } from './visitKey.js';

export interface GateContext {
  intentContent: string | undefined;
  ownerDir: string;
  ownerKey: string | null;
  ownerRelDir: string;
  gateEligible: boolean;
  selfAuthoring: boolean;
}

/**
 * Resolve the owner fractal's INTENT content and the gate-eligibility of
 * this visit: self-authoring (writing the INTENT.md itself), the owner's
 * delivery key, and whether an undelivered mutation must gate-deny.
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
  const selfAuthoring = mutation && isIntentMd(filePath);
  const { intentContent, ownerDir } = resolveOwnerIntent(
    fileDir,
    chain,
    intents,
  );
  const hasOwner = intentContent !== undefined;
  const ownerRelDir =
    normalize(portableRelative(boundary, ownerDir)) ||
    PORTABLE_PATH_MARKERS.CURRENT;
  // Self-authoring delivers the module being documented, whether or not its
  // INTENT.md existed on disk before this write.
  const ownerKey = selfAuthoring
    ? readKey
    : hasOwner
      ? visitKey(boundary, ownerRelDir)
      : null;

  const docTarget = isIntentMd(filePath) || isDetailMd(filePath);
  const gateEligible = mutation && hasOwner && !docTarget;

  return {
    intentContent,
    ownerDir,
    ownerKey,
    ownerRelDir,
    gateEligible,
    selfAuthoring,
  };
}
