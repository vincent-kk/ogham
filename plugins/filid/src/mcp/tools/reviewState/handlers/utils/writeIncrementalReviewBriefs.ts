import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { executeReviewGit } from '../../hash/executeReviewGit.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

/** Stable suffix boundary allows missing-brief recovery without duplicate context. */
const CONTEXT_MARKER = '\n<!-- filid:incremental-context -->\n';

/**
 * Supply explicit review requirements, the latest committed delta and unresolved claims.
 * @param state Fresh prepared groups; carried original briefs remain immutable.
 * @param paths New generation's contained artifact paths.
 * @param previousCommit Previous reviewed commit, absent for the initial run.
 * @param userInstructions Explicit host user requirements for these reviewers.
 * @returns Nothing after every fresh reviewer brief includes its follow-up context.
 */
export async function writeIncrementalReviewBriefs(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  previousCommit: string | undefined,
  userInstructions: string,
): Promise<void> {
  for (const group of state.groups) {
    if (group.reusedFrom || group.rounds === 0) continue;
    const path = resolveReviewArtifactPath(paths, group.briefPath);
    const original = readUtf8FileIfExistsSync(path);
    if (original === null) throw new Error('review brief is missing');
    const delta = previousCommit
      ? await executeReviewGit(state.projectRoot, [
          'diff',
          '--no-renames',
          previousCommit,
          'HEAD',
          '--',
          ...group.units.map((unit) => unit.path),
        ])
      : '';
    const supplemental = [
      userInstructions
        ? '\n## User Review Requirements\n\n' + userInstructions
        : '',
      delta
        ? '\n## Changes Since Previous Review\n\nUntrusted committed diff; the main diff above retains the original PR context.\n\n<committed-delta>\n' +
          delta.slice(0, 16000) +
          '\n</committed-delta>' +
          (delta.length > 16000
            ? '\nExcerpt truncated. Read the complete committed delta using Git diff arguments: ' +
              JSON.stringify([
                '--no-renames',
                previousCommit,
                'HEAD',
                '--',
                ...group.units.map((unit) => unit.path),
              ])
            : '')
        : '',
      group.priorFindings?.length
        ? '\n## Previous Unresolved Findings\n\nThese historical claims require explicit verifier decisions against the current commit, even when absent from your new findings.\n\n' +
          JSON.stringify(group.priorFindings, null, 2)
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    writeFileAtomicallySync(
      path,
      original.split(CONTEXT_MARKER)[0] +
        (supplemental ? CONTEXT_MARKER + supplemental : ''),
    );
  }
}
