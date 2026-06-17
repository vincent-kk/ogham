import { ErrorCode } from '../types/index.js';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.BudgetExhausted]:
    'Provider reported budget or turn-limit exhaustion.',
  [ErrorCode.RateLimit]:
    'Provider rate limit hit. Retry after a short backoff.',
  [ErrorCode.Auth]:
    'Authentication required. Re-login through the provider CLI.',
  [ErrorCode.Disabled]:
    'Provider is disabled in cennad config. Enable it via /cennad:setup.',
  [ErrorCode.Network]: 'Network failure while contacting the provider.',
  [ErrorCode.CliError]: 'External CLI failed to execute.',
  [ErrorCode.Unknown]: 'Unclassified failure.',
};
