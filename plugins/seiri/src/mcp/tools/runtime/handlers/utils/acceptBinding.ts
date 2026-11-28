import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  DIRECTIVES_CONTEXT_LIMIT,
  DIRECTIVE_INDEX_FILE,
} from '../../../../../constants/directives.js';
import { DIRECTIVES_DIR, IGNORE_FILE } from '../../../../../constants/files.js';
import { ensureSeiriDir } from '../../../../../core/index.js';
import { loadIntervention } from '../../../../../core/infra/configLoader/index.js';
import type {
  DirectiveInspection,
  DirectiveScope,
  DirectiveSetSummary,
  DirectivesResult,
} from '../../../../../types/directives.js';

/**
 * Validate ignore coverage and report what the native bind hook can commit.
 * @param root Checkout that owns the directive files.
 * @param summary Validated nonempty set.
 * @param inspection Structural findings about the same set.
 * @param scope Requested audience.
 * @returns Acceptance or the effective low dial, plus a warning when needed.
 * A structured set is estimated inline unless the inspection found its entry document over its byte limit; other sets are estimated by total size.
 */
export function acceptBinding(
  root: string,
  summary: DirectiveSetSummary,
  inspection: DirectiveInspection,
  scope: DirectiveScope,
): DirectivesResult {
  const directory = ensureSeiriDir(root);
  const lines =
    readUtf8FileIfExistsSync(portableJoin(directory, IGNORE_FILE))?.split(
      /\r?\n/,
    ) ?? [];
  const excluded = lines.includes(`${DIRECTIVES_DIR}/`);
  const warning = excluded
    ? {}
    : {
        warning:
          'The seiri ignore file needs a directives/ rule to keep these files untracked.',
      };
  const dial = loadIntervention(root).effective;
  if (dial === 'off' || dial === 'advisory')
    return {
      ...summary,
      ...inspection,
      ...warning,
      status: 'dial_low',
      op: 'bind',
      dial,
    };
  const fits = inspection.structured
    ? !inspection.violations.some(
        ({ file, problem }) =>
          file === DIRECTIVE_INDEX_FILE && problem === 'over_limit',
      )
    : summary.bytes <= Math.min(...Object.values(DIRECTIVES_CONTEXT_LIMIT));
  const estimatedMode = fits ? 'inline' : 'pointer';
  return {
    ...summary,
    ...inspection,
    ...warning,
    status: 'accepted',
    op: 'bind',
    scope,
    estimatedMode,
  };
}
