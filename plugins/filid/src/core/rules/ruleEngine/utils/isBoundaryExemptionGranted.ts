import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import { samePath } from '@ogham/cross-platform/paths';
import { portableRelative } from '@ogham/cross-platform/paths/relative';

import type { FractalNode } from '../../../../types/fractal.js';

import { isExempt } from './isExempt.js';

/** Does the declared path name the target itself, or an ancestor directory of it? */
function covers(declaredPath: string, targetPath: string): boolean {
  if (samePath(declaredPath, targetPath)) return true;
  const remainder = portableRelative(declaredPath, targetPath);
  const comparable = pathForCompare(remainder);
  return (
    remainder !== '' &&
    comparable !== '..' &&
    !comparable.startsWith('../') &&
    !portableIsAbsolute(remainder)
  );
}

/**
 * Does the owner's DETAIL.md grant this consumer a direct import of this target?
 *
 * The target is an organ path when the organ resolver claimed the reference, and
 * the resolved file path otherwise — a fractal's internals need the same escape
 * hatch, because a consumer can be barred from the entry point by something the
 * boundary rule cannot see. The standing case is a hook bundle: importing the
 * barrel drags every module it re-exports into the bundle.
 *
 * All four conditions are load-bearing: the declaration must cover this target,
 * open direct import, cover this consumer, and carry a reason. An exemption
 * without a reason is a disabled rule wearing a declaration, so it is treated as
 * an unmet contract rather than a grant — `detail-document-contract` reports the
 * missing reason separately.
 */
export function isBoundaryExemptionGranted(
  owner: FractalNode,
  targetPath: string,
  consumerPath: string,
): boolean {
  return (owner.documentEvidence?.boundaryExemptions ?? []).some(
    (exemption) =>
      exemption.directImport &&
      exemption.reason.trim().length > 0 &&
      covers(exemption.targetPath, targetPath) &&
      isExempt({ path: consumerPath }, exemption.consumers),
  );
}
