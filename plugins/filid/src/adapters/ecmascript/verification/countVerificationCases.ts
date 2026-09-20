import { readFileSync } from 'node:fs';

import type { VerificationCaseCount } from '../../../types/adapters.js';

import { candidateRole } from './candidateRole.js';
import { countSemanticCases } from './countSemanticCases.js';
import { showsVerificationSyntax } from './showsVerificationSyntax.js';

/** A fresh reading for a file this adapter does not verify, owned by its caller. */
function unsupportedReading(): VerificationCaseCount {
  return {
    certainty: 'unsupported',
    exactCount: undefined,
    knownLowerBound: 0,
    reasons: ['file role is not supported by the ECMAScript adapter'],
  };
}

/**
 * Count the verification cases one file declares, by its role.
 *
 * Kept apart from the adapter object so a consumer that only parses files —
 * the facts extractor — reaches it without the discovery code, whose ignore
 * filter starts git.
 *
 * The role is resolved from the same count the caller gets back, since
 * confirming a role IS counting the file: `classifyVerificationPath` answers
 * `unsupported` exactly when the name proposes no role or the count shows no
 * verification syntax. A name that proposes no role is answered without
 * opening the file.
 *
 * @param filePath Absolute path of the file to count.
 * @returns The count, or an `unsupported` reading for a file this adapter does not verify.
 * @throws When the file cannot be read.
 */
export function countVerificationCases(
  filePath: string,
): VerificationCaseCount {
  if (candidateRole(filePath) === 'unsupported') return unsupportedReading();
  const count = countSemanticCases(readFileSync(filePath, 'utf8'));
  return showsVerificationSyntax(count) ? count : unsupportedReading();
}
