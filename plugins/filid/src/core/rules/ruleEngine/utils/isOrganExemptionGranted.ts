import { samePath } from '@ogham/cross-platform/paths';

import type { FractalNode } from '../../../../types/fractal.js';

import { isExempt } from './isExempt.js';

/**
 * Does the owner's DETAIL.md grant this consumer a direct import of this organ?
 *
 * All four conditions are load-bearing: the declaration must name this organ,
 * open direct import, cover this consumer, and carry a reason. An exemption
 * without a reason is a disabled rule wearing a declaration, so it is treated as
 * an unmet contract rather than a grant — `detail-document-contract` reports the
 * missing reason separately.
 */
export function isOrganExemptionGranted(
  owner: FractalNode,
  organPath: string,
  consumerPath: string,
): boolean {
  return (owner.documentEvidence?.organExemptions ?? []).some(
    (exemption) =>
      exemption.directImport &&
      exemption.reason.trim().length > 0 &&
      samePath(exemption.organPath, organPath) &&
      isExempt({ path: consumerPath }, exemption.consumers),
  );
}
