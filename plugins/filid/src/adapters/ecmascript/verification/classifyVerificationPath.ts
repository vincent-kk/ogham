import { readFileSync } from 'node:fs';

import type { VerificationRole } from '../../../types/adapters.js';

import { candidateRole } from './candidateRole.js';
import { countSemanticCases } from './countSemanticCases.js';
import { showsVerificationSyntax } from './showsVerificationSyntax.js';

/**
 * Resolve a verification role from the naming convention AND the file content.
 * Suffix alone would sell a boundary and DAG exemption for the price of a
 * rename: verification files are exempt from those rules, so `git mv x.ts
 * x.spec.ts` would retire a violation without changing a line of code. Reading
 * the content is what makes the role evidence instead of a name.
 */
export function classifyVerificationPath(
  filePath: string,
): VerificationRole | 'unsupported' {
  const candidate = candidateRole(filePath);
  if (candidate === 'unsupported') return 'unsupported';
  return showsVerificationSyntax(
    countSemanticCases(readFileSync(filePath, 'utf8')),
  )
    ? candidate
    : 'unsupported';
}
