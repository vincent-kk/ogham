import type {
  VerificationCaseCount,
  VerificationRole,
} from '../../../types/adapters.js';
import { verificationRoleFromName } from '../../../adapters/ecmascript/verification/verificationRoleFromName.js';
import type { ScannedSource } from '../scanSource.js';

import { countSemanticCases } from './countSemanticCases.js';
import { showsVerificationSyntax } from './showsVerificationSyntax.js';

/** What one file's text says it is, for the verification axis. */
export interface VerificationReading {
  /** The confirmed role, or `unsupported` when the content does not support it. */
  role: VerificationRole | 'unsupported';
  /** The case count, or an `unsupported` reading when the role is not confirmed. */
  cases: VerificationCaseCount;
}

/** A fresh reading for a file this analysis does not verify, owned by its caller. */
function unsupportedReading(): VerificationCaseCount {
  return {
    certainty: 'unsupported',
    exactCount: undefined,
    knownLowerBound: 0,
    reasons: ['file role is not supported by the ECMAScript adapter'],
  };
}

/**
 * Read one file's verification role and case count from the same count.
 *
 * Confirming a role IS counting the file — a `.spec` name proposes the role
 * and only verification syntax confirms it — so both answers come from one
 * count here rather than from two counts of the same text.
 *
 * @param filePath - Path whose name proposes the role; nothing is opened.
 * @param scanned - The file's text and its scan.
 * @returns The confirmed role and the count that confirmed it.
 */
export function verificationFromSource(
  filePath: string,
  scanned: ScannedSource,
): VerificationReading {
  const proposed = verificationRoleFromName(filePath);
  if (proposed === 'unsupported')
    return { role: 'unsupported', cases: unsupportedReading() };
  const count = countSemanticCases(scanned.source, scanned);
  return showsVerificationSyntax(count)
    ? { role: proposed, cases: count }
    : { role: 'unsupported', cases: unsupportedReading() };
}
