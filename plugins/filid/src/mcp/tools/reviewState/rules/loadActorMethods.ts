import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

/**
 * Load the canonical actor methods from the installed cross-review skill.
 * @param pluginRoot Resolved Filid plugin root, or null if unavailable.
 * @returns Verbatim reviewer and verifier Markdown without altering either method.
 * @throws A stable diagnostic for missing methods, or a containment error.
 */
export function loadActorMethods(pluginRoot: string | null): {
  reviewer: string;
  verifier: string;
} {
  if (pluginRoot === null)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.ACTOR_METHOD_MISSING,
      'Cross-review actor method is missing: plugin root is unavailable.',
    );
  const methods = [
    REVIEW_STATE_FILE_NAMES.REVIEWER_METHOD,
    REVIEW_STATE_FILE_NAMES.VERIFIER_METHOD,
  ].map((relative) => {
    const path = resolveContainedPath(
      pluginRoot,
      'skills',
      'cross-review',
      relative,
    );
    assertNoSymlinkDescendantsSync(pluginRoot, path);
    const body = readUtf8FileIfExistsSync(path);
    if (body === null)
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.ACTOR_METHOD_MISSING,
        `Cross-review actor method is missing: "${path}".`,
      );
    return body;
  });
  return { reviewer: methods[0]!, verifier: methods[1]! };
}
