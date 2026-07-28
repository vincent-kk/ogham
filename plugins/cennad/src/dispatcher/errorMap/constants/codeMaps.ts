import { ErrorCode } from '../../../types/index.js';

export const EXIT_CODE_MAP: Record<number, ErrorCode> = {
  42: ErrorCode.CliError,
  53: ErrorCode.BudgetExhausted,
  55: ErrorCode.Auth,
  73: ErrorCode.CliError,
  127: ErrorCode.CliError,
};

// ETIMEDOUT here is this dispatcher's own liveness stop (idle limit or tier
// ceiling) raised by utils/timeoutError.ts — never a socket failure, which the
// CLI reports through stderr and classify() matches as `network` there.
export const SPAWN_ERROR_MAP: Record<string, ErrorCode> = {
  ENOENT: ErrorCode.CliError,
  ECONNRESET: ErrorCode.Network,
  ETIMEDOUT: ErrorCode.Timeout,
  ENOTFOUND: ErrorCode.Network,
};
