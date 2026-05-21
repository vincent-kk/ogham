import type { ErrorCode } from '../types/index.js';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  budget_exhausted: 'Provider reported budget or turn-limit exhaustion.',
  rate_limit: 'Provider rate limit hit. Retry after a short backoff.',
  auth: 'Authentication required. Re-login through the provider CLI.',
  network: 'Network failure while contacting the provider.',
  cli_error: 'External CLI failed to execute.',
  unknown: 'Unclassified failure.',
};
