import { pathForCompare } from '@ogham/cross-platform';

import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type { UnknownFile } from '../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

/**
 * Whether a diagnostic explains why one of the given unknown files is unknown.
 * @param diagnostic Snapshot diagnostic.
 * @param unknownFiles Files to match, with project-relative paths.
 * @param projectRoot Root the diagnostic path is made relative to.
 * @returns True when the diagnostic names one of the files and its code is
 *   one of that file's causes; such a diagnostic changes no conclusion the
 *   file does not.
 */
export function isAttributedToUnknownFile(
  diagnostic: ToolDiagnostic,
  unknownFiles: readonly UnknownFile[],
  projectRoot: string,
): boolean {
  if (!diagnostic.path) return false;
  const path = pathForCompare(
    toProjectRelativePath(projectRoot, diagnostic.path),
  );
  return unknownFiles.some(
    (file) =>
      pathForCompare(file.path) === path &&
      file.causes.includes(diagnostic.code),
  );
}
