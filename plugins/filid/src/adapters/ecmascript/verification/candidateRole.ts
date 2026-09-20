import { basename, extname } from 'node:path';

import type { VerificationRole } from '../../../types/adapters.js';
import { SOURCE_EXTENSIONS } from '../structure/ecmascriptConventions.js';

/**
 * Read the verification role a file's name proposes.
 *
 * The naming convention picks a candidate; it never confirms the role, because
 * a suffix would otherwise sell the boundary and DAG exemption a verification
 * file carries for the price of a rename. Confirming it means reading the
 * content — `showsVerificationSyntax` over the file's case count.
 * @param filePath Path whose extension and stem are read; nothing is opened.
 * @returns The proposed role, or `unsupported` for an extension or stem this adapter does not verify.
 */
export function candidateRole(
  filePath: string,
): VerificationRole | 'unsupported' {
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
