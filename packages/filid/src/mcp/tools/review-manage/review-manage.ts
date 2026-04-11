import { handleCheckCache } from './handlers/check-cache.js';
import { handleCheckpoint } from './handlers/checkpoint.js';
import { handleCleanup } from './handlers/cleanup.js';
import { handleContentHash } from './handlers/content-hash.js';
import { handleElectCommittee } from './handlers/elect-committee.js';
import { handleEnsureDir } from './handlers/ensure-dir.js';
import { handleNormalizeBranch } from './handlers/normalize-branch.js';
import {
  formatPrComment,
  formatRevalidateComment,
  handleGenerateHumanSummary,
} from './format/review-format.js';

export interface ReviewManageInput {
  action:
    | 'normalize-branch'
    | 'ensure-dir'
    | 'checkpoint'
    | 'elect-committee'
    | 'cleanup'
    | 'content-hash'
    | 'check-cache'
    | 'format-pr-comment'
    | 'format-revalidate-comment'
    | 'generate-human-summary';
  projectRoot: string;
  branchName?: string;
  baseRef?: string;
  changedFilesCount?: number;
  changedFractalsCount?: number;
  hasInterfaceChanges?: boolean;
  /**
   * When true, bypass adversarial committee election and return the
   * integrated `adjudicator` fast-path agent as the sole committee
   * member. Triggered by the `--solo` review flag. The adjudicator
   * internally covers all six committee perspectives in a single
   * context and skips the state machine.
   */
  adjudicatorMode?: boolean;
}

export async function handleReviewManage(
  args: unknown,
): Promise<Record<string, unknown>> {
  const input = args as ReviewManageInput;

  if (!input.action) {
    throw new Error('action is required');
  }
  if (!input.projectRoot) {
    throw new Error('projectRoot is required');
  }

  const handlers: Record<
    string,
    (input: ReviewManageInput) => Promise<Record<string, unknown>>
  > = {
    'normalize-branch': handleNormalizeBranch,
    'ensure-dir': handleEnsureDir,
    checkpoint: handleCheckpoint,
    'elect-committee': handleElectCommittee,
    cleanup: handleCleanup,
    'content-hash': handleContentHash,
    'check-cache': handleCheckCache,
    'format-pr-comment': formatPrComment,
    'format-revalidate-comment': formatRevalidateComment,
    'generate-human-summary': handleGenerateHumanSummary,
  };

  const handler = handlers[input.action];
  if (!handler) {
    throw new Error(`Unknown action: ${input.action}`);
  }

  return handler(input);
}
