import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import { resolveBaseRef } from '../../assess/resolveBaseRef.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';

/**
 * Resolve prepare's base without silently replacing an explicit invalid ref.
 * @param projectRoot Absolute Git toplevel used for read-only ref queries.
 * @param baseRef Explicit ref, or undefined to use remote and local defaults.
 * @returns The verified ref spelling used by prepare's artifacts.
 * @throws A stable base-ref diagnostic when the requested resolution fails.
 */
export async function resolvePrepareBaseRef(
  projectRoot: string,
  baseRef?: string,
): Promise<string> {
  if (baseRef === undefined) {
    const resolved = await resolveBaseRef(projectRoot);
    if (resolved !== null) return resolved;
  } else if (typeof baseRef === 'string' && baseRef.length > 0)
    try {
      await executeReviewGit(projectRoot, [
        'rev-parse',
        '--verify',
        '--end-of-options',
        baseRef,
      ]);
      return baseRef;
    } catch (cause) {
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.BASE_REF_UNRESOLVED,
        `Review base ref could not be resolved: ${baseRef}`,
        { cause },
      );
    }

  throw new ToolDiagnosticError(
    REVIEW_STATE_DIAGNOSTIC_CODES.BASE_REF_UNRESOLVED,
    'No review base ref could be resolved.',
  );
}
