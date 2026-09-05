import { resolveReviewStatePaths } from '../../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewBriefInput } from './buildReviewBriefInput.js';

/**
 * Build prepared facts without Git or filesystem effects for handoff checks.
 * @param projectRoot Absolute root used only to resolve artifact paths.
 * @returns A mutable state and its canonical paths.
 */
export function buildReviewHandoffFixture(projectRoot: string) {
  const brief = buildReviewBriefInput();
  const paths = resolveReviewStatePaths(projectRoot, 'feature/handoff');
  const state: ReviewStateRecord = {
    schemaVersion: 2,
    projectRoot,
    branchName: 'feature/handoff',
    normalizedBranch: paths.normalizedBranch,
    baseRef: 'main',
    baseCommit: 'base',
    sourceHash: brief.sourceHash,
    fileHashes: {},
    phase: 'prepared',
    preparedAt: '2026-09-05T00:00:00.000Z',
    effort: 'medium',
    groups: [brief.group],
    scope: {
      snapshotHash: 'snapshot',
      evidenceComplete: true,
      worktree: 'clean',
      dirtyPaths: [],
      statuses: { structure: 'ok', verification: 'ok' },
      files: [...brief.files],
      candidates: [...brief.candidates],
      informational: [],
      outOfScopeCount: 0,
      infoCount: 0,
    },
    verdict: null,
  };
  return { state, paths };
}
