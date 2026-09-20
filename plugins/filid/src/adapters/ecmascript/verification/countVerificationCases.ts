import { readFileSync } from 'node:fs';

import type { VerificationCaseCount } from '../../../types/adapters.js';

import { classifyVerificationPath } from './classifyVerificationPath.js';
import { countSemanticCases } from './countSemanticCases.js';

/**
 * Count the verification cases one file declares, by its role.
 *
 * Kept apart from the adapter object so a consumer that only parses files —
 * the facts extractor — reaches it without the discovery code, whose ignore
 * filter starts git.
 *
 * @param filePath Absolute path of the file to count.
 * @returns The count, or an `unsupported` reading for a file this adapter does not verify.
 * @throws When the file cannot be read.
 */
export function countVerificationCases(
  filePath: string,
): VerificationCaseCount {
  if (classifyVerificationPath(filePath) === 'unsupported')
    return {
      certainty: 'unsupported',
      exactCount: undefined,
      knownLowerBound: 0,
      reasons: ['file role is not supported by the ECMAScript adapter'],
    };
  return countSemanticCases(readFileSync(filePath, 'utf8'));
}
