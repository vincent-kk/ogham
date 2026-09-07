import type { VerificationFileAnalysis } from '../../../../types/verification.js';
import type { ReviewScopeFile } from '../state/reviewStateTypes.js';

import { toProjectRelativePath } from './utils/toProjectRelativePath.js';

/**
 * Select verification analyses whose files or owners intersect changed scope.
 * @param files Project-wide verification file analyses to filter.
 * @param changed Changed-file roster with project-relative paths and owners.
 * @param projectRoot Absolute project root used to normalize analysis paths.
 * @returns Verification analyses whose file or owner intersects a changed entry.
 */
export function selectChangedScopeVerificationFiles(
  files: readonly VerificationFileAnalysis[],
  changed: readonly ReviewScopeFile[],
  projectRoot: string,
): VerificationFileAnalysis[] {
  return files.filter((file) => {
    const filePath = toProjectRelativePath(projectRoot, file.path);
    const ownerFractalPath = toProjectRelativePath(
      projectRoot,
      file.ownerFractalPath,
    );
    return changed.some(
      (changedFile) =>
        filePath === changedFile.path ||
        ownerFractalPath === changedFile.owner ||
        changedFile.path.startsWith(`${ownerFractalPath}/`),
    );
  });
}
