import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

import type { VerificationRole } from '../../../types/adapters.js';
import { SOURCE_EXTENSIONS } from '../structure/ecmascriptConventions.js';

import { countSemanticCases } from './countSemanticCases.js';

/** The naming convention picks a candidate; it never confirms the role. */
function candidateRole(filePath: string): VerificationRole | 'unsupported' {
  const extension = extname(filePath);
  if (
    !SOURCE_EXTENSIONS.includes(extension as (typeof SOURCE_EXTENSIONS)[number])
  )
    return 'unsupported';
  const stem = basename(filePath, extension);
  if (stem.endsWith('.spec')) return 'spec-document';
  if (stem.endsWith('.test')) return 'test-record';
  return 'unsupported';
}

/**
 * An exact count of zero is the one reading that means "no cases here". Any
 * lesser certainty means the counter saw verification syntax it could not
 * resolve — uncountable is not absent.
 */
function holdsCases(source: string): boolean {
  const count = countSemanticCases(source);
  return count.knownLowerBound > 0 || count.certainty !== 'exact';
}

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
  return holdsCases(readFileSync(filePath, 'utf8')) ? candidate : 'unsupported';
}
