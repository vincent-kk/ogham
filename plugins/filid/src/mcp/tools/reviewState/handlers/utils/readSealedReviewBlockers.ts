import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

import { parseSealedReviewFrontmatter } from './parseSealedReviewFrontmatter.js';

/** Cached blocker artifact status derived only from canonical sealed paths. */
export interface SealedReviewBlockerStatus {
  /** Canonical artifact path when the sealed report claims a valid sidecar. */
  blockersPath: string | null;
  /** Missing or invalid artifact reason that prevents trusted cache reuse. */
  diagnostic: ToolDiagnostic | null;
}

/**
 * Read a sealed report marker and validate its canonical blocker sidecar.
 * @param paths Pre-resolved and symlink-guarded canonical review paths.
 * @param state Current-policy sealed state supplying immutable identity.
 * @returns Trusted path, legacy/conclusive null, or one blocking diagnostic.
 */
export function readSealedReviewBlockers(
  paths: ReviewStatePaths,
  state: ReviewStateRecord,
): SealedReviewBlockerStatus {
  const report = readUtf8FileIfExistsSync(paths.reportPath);
  if (report === null) return invalidBlockerStatus(paths.reportPath);
  const reportMetadata = parseSealedReviewFrontmatter(report);
  if (!reportMetadata)
    return report.startsWith('---')
      ? invalidBlockerStatus(paths.reportPath)
      : { blockersPath: null, diagnostic: null };
  const marker = reportMetadata.get('blockers_report');
  if (state.verdict === 'APPROVED')
    return marker === undefined
      ? { blockersPath: null, diagnostic: null }
      : invalidBlockerStatus(paths.reportPath);
  if (marker === undefined) return { blockersPath: null, diagnostic: null };
  if (marker !== REVIEW_STATE_FILE_NAMES.BLOCKERS)
    return invalidBlockerStatus(paths.reportPath);

  const artifact = readUtf8FileIfExistsSync(paths.blockersPath);
  if (artifact === null)
    return {
      blockersPath: null,
      diagnostic: {
        code: REVIEW_STATE_DIAGNOSTIC_CODES.BLOCKERS_MISSING,
        message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.BLOCKERS_MISSING,
        path: paths.blockersPath,
      },
    };
  const metadata = parseSealedReviewFrontmatter(artifact);
  if (
    !metadata ||
    metadata.get('blockers_schema') !== '1' ||
    metadata.get('source_hash') !== JSON.stringify(state.sourceHash) ||
    metadata.get('snapshot_hash') !==
      JSON.stringify(state.scope.snapshotHash) ||
    metadata.get('branch') !== JSON.stringify(state.branchName) ||
    metadata.get('verdict') !== state.verdict
  )
    return invalidBlockerStatus(paths.blockersPath);
  return { blockersPath: paths.blockersPath, diagnostic: null };
}

/** Build the single invalid-artifact result shared by report and sidecar checks. */
function invalidBlockerStatus(path: string): SealedReviewBlockerStatus {
  const diagnostic = {
    code: REVIEW_STATE_DIAGNOSTIC_CODES.BLOCKERS_INVALID,
    message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.BLOCKERS_INVALID,
    path,
  };
  return {
    blockersPath: null,
    diagnostic,
  };
}
