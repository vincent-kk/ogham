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

/** Presentation separator before replaceable incremental review context. */
const INCREMENTAL_CONTEXT_SEPARATOR = '\n<!-- filid:incremental-context -->\n';

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
    if (group.coreBriefByteLength === undefined)
      throw new Error('review brief core byte length is missing');
    const originalBytes = Buffer.from(original, 'utf8');
    if (originalBytes.byteLength < group.coreBriefByteLength)
      throw new Error('review brief is shorter than its core byte length');
    const coreBrief = originalBytes
      .subarray(0, group.coreBriefByteLength)
      .toString('utf8');
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
      coreBrief +
        (supplemental ? INCREMENTAL_CONTEXT_SEPARATOR + supplemental : ''),
    );
  }
}
