import type { REVIEW_STATE_ACTIONS } from '../../../../../constants/reviewState.js';
import {
  REVIEW_AUTO_LOW_EFFORT_GROUP_THRESHOLD,
  REVIEW_CONCURRENCY,
  REVIEW_DEFAULT_EFFORT,
  REVIEW_GROUP_CHURN_LIMIT,
  REVIEW_LOCKFILE_BASENAMES,
  REVIEW_MAX_GROUPS,
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

/** Handoff input that reuses prepare's repository-backed path settings. */
type HandoffInput = Extract<
  ReviewStateInput,
  Record<'action', typeof REVIEW_STATE_ACTIONS.HANDOFF>
>;

/** Settings inputs shared by prepare and handoff without admitting other actions. */
type PrepareSettingsInput =
  | Pick<PrepareInput, 'action' | 'projectRoot' | 'effort'>
  | Pick<HandoffInput, 'action' | 'projectRoot'>;

/**
 * Resolve settings shared by prepare and handoff through request and config defaults.
 * @param input Validated request whose root selects project config.
 * @returns Effective review limits, rule root, generated paths, and concurrency.
 * @throws When a configured value fails schema validation.
 */
export function resolvePrepareSettings(input: PrepareSettingsInput) {
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
  const requestedEffort = 'effort' in input ? input.effort : undefined;
  const effortMode = requestedEffort ?? review?.effort ?? REVIEW_DEFAULT_EFFORT;
  return {
    effortMode,
    effortExplicit:
      requestedEffort !== undefined || review?.effort !== undefined,
    autoLowEffortGroupThreshold:
      review?.autoLowEffortGroupThreshold ??
      REVIEW_AUTO_LOW_EFFORT_GROUP_THRESHOLD,
    concurrency: review?.concurrency ?? REVIEW_CONCURRENCY,
    groupFileLimit: review?.groupFileLimit,
    maxGroups: review?.maxGroups ?? REVIEW_MAX_GROUPS,
    highRiskPaths: review?.highRiskPaths ?? [],
    groupChurnLimit: review?.groupChurnLimit ?? REVIEW_GROUP_CHURN_LIMIT,
    planChurnLimit: review?.planChurnLimit ?? REVIEW_PLAN_CHURN_LIMIT,
    lockfiles: review?.lockfiles ?? REVIEW_LOCKFILE_BASENAMES,
    generatedPaths: config?.structure?.generatedPaths ?? [],
    pluginRoot: resolvePluginRoot(),
  };
}
