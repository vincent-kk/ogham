import { resolveGitRoot } from '../../../core/infra/configLoader/utils/resolveGitRoot.js';

import {
  formatPrComment,
  formatRevalidateComment,
  handleGenerateHumanSummary,
} from './format/reviewFormat.js';
import { handleCheckCache } from './handlers/checkCache.js';
import { handleCheckpoint } from './handlers/checkpoint.js';
import { handleCleanup } from './handlers/cleanup.js';
import { handleContentHash } from './handlers/contentHash.js';
import { handleElectCommittee } from './handlers/electCommittee.js';
import { handleEnsureDir } from './handlers/ensureDir.js';
import { handleNormalizeBranch } from './handlers/normalizeBranch.js';

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
   * True when the diff includes INTENT.md or DETAIL.md additions or
   * modifications. Used by `elect-committee` so `knowledge-manager` joins
   * LOW-complexity committees that touch documentation, preventing
   * cap-rule misapplications from passing unchallenged.
   *
   * Computation rule (caller-side; defined in
   * `skills/cross-review/contracts.md`):
   *   git diff --name-only <base>...HEAD | grep -E '(/|^)(INTENT|DETAIL)\.md$'
   *   exit 0 → true · exit 1 → false · uninspectable → true (fail-safe)
   */
  hasDocumentChanges?: boolean;
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

  // Resolve to git root so monorepo sub-paths are normalized
  input.projectRoot = resolveGitRoot(input.projectRoot);

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
