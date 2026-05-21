import type { ErrorCode } from '../../../types/index.js';

export const EXIT_CODE_MAP: Record<number, ErrorCode> = {
  42: 'cli_error',
  53: 'budget_exhausted',
  55: 'auth',
  73: 'cli_error',
  127: 'cli_error',
};

export const SPAWN_ERROR_MAP: Record<string, ErrorCode> = {
  ENOENT: 'cli_error',
  ECONNRESET: 'network',
  ETIMEDOUT: 'network',
  ENOTFOUND: 'network',
};
