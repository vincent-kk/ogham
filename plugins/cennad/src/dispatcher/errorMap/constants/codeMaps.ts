import { ErrorCode } from '../../../types/index.js';

export const EXIT_CODE_MAP: Record<number, ErrorCode> = {
  42: ErrorCode.CliError,
  53: ErrorCode.BudgetExhausted,
  55: ErrorCode.Auth,
  73: ErrorCode.CliError,
  127: ErrorCode.CliError,
};

export const SPAWN_ERROR_MAP: Record<string, ErrorCode> = {
  ENOENT: ErrorCode.CliError,
  ECONNRESET: ErrorCode.Network,
  ETIMEDOUT: ErrorCode.Network,
  ENOTFOUND: ErrorCode.Network,
};
