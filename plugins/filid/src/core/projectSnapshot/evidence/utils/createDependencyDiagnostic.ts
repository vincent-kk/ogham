import { createHash } from 'node:crypto';

import { portableRelative } from '@ogham/cross-platform';

import type { SnapshotDiagnostic } from '../../../../types/fractal.js';

/**
 * Build a diagnostic about one reference a file makes.
 *
 * The cause identity hashes the code, the project-relative file and the
 * specifier, so the same reference keeps one identity across project roots
 * and value/type imports of one target share it.
 * @param code - Diagnostic code, e.g. `unresolved-local-dependency`
 * @param message - Human-readable explanation
 * @param nextAction - What the caller does next
 * @param projectRoot - Root the file path is made relative to
 * @param filePath - File that holds the reference
 * @param specifier - Raw specifier of the reference
 * @returns A diagnostic scoped to dependency and boundary analysis
 */
export function createDependencyDiagnostic(
  code: string,
  message: string,
  nextAction: string,
  projectRoot: string,
  filePath: string,
  specifier: string,
): SnapshotDiagnostic {
  return {
    code,
    message,
    nextAction,
    path: filePath,
    affects: ['dependencies', 'boundaries'],
    specifier,
    causeId: createHash('sha256')
      .update(
        JSON.stringify([
          code,
          portableRelative(projectRoot, filePath),
          specifier,
        ]),
      )
      .digest('hex'),
  };
}
