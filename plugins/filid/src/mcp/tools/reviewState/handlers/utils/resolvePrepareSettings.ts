import type { REVIEW_STATE_ACTIONS } from '../../../../../constants/reviewState.js';
import {
  REVIEW_CONCURRENCY,
  REVIEW_DEFAULT_EFFORT,
  REVIEW_EFFORT_ROUNDS,
  REVIEW_GROUP_CHURN_LIMIT,
  REVIEW_GROUP_FILE_LIMIT,
  REVIEW_LOCKFILE_BASENAMES,
  REVIEW_PLAN_CHURN_LIMIT,
} from '../../../../../constants/reviewState.js';
import { loadConfig } from '../../../../../core/index.js';
import { resolvePluginRoot } from '../../../../../core/infra/index.js';
import type { ReviewStateInput } from '../../state/reviewStateTypes.js';

/** Prepare input narrowed from the public review-state action union. */
type PrepareInput = Extract<
  ReviewStateInput,
  Record<'action', typeof REVIEW_STATE_ACTIONS.PREPARE>
>;

/**
 * Resolve every prepare setting through request, config, and constant defaults.
 * @param input Validated prepare request whose root selects project config.
 * @returns Effective review limits, rule root, generated paths, and concurrency.
 * @throws When a configured value fails schema validation.
 */
export function resolvePrepareSettings(input: PrepareInput) {
  const loaded = loadConfig(input.projectRoot);
  const validationFailure = loaded.warnings.find(
    (warning) =>
      warning.startsWith('invalid value at review') ||
      warning.startsWith('config validation failed at review'),
  );
  if (validationFailure)
    throw new Error(`config validation failed: ${validationFailure}`);
  const config = loaded.config;
  const review = config?.review;
  const effort = input.effort ?? review?.effort ?? REVIEW_DEFAULT_EFFORT;
  return {
    effort,
    rounds: REVIEW_EFFORT_ROUNDS[effort],
    concurrency: review?.concurrency ?? REVIEW_CONCURRENCY,
    groupFileLimit: review?.groupFileLimit ?? REVIEW_GROUP_FILE_LIMIT,
    groupChurnLimit: review?.groupChurnLimit ?? REVIEW_GROUP_CHURN_LIMIT,
    planChurnLimit: review?.planChurnLimit ?? REVIEW_PLAN_CHURN_LIMIT,
    lockfiles: review?.lockfiles ?? REVIEW_LOCKFILE_BASENAMES,
    generatedPaths: config?.structure?.generatedPaths ?? [],
    pluginRoot: resolvePluginRoot(),
  };
}
