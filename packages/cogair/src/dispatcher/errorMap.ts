import { ERROR_MESSAGES } from '../constants/errorCodes.js';
import type { ConversationError, ErrorCode } from '../types/index.js';

export interface MapErrorInput {
  exitCode: number;
  stderr: string;
  spawnError?: NodeJS.ErrnoException | null;
}

const EXIT_CODE_MAP: Record<number, ErrorCode> = {
  42: 'cli_error',
  53: 'budget_exhausted',
  55: 'auth',
  73: 'cli_error',
  127: 'cli_error',
};

const SPAWN_ERROR_MAP: Record<string, ErrorCode> = {
  ENOENT: 'cli_error',
  ECONNRESET: 'network',
  ETIMEDOUT: 'network',
  ENOTFOUND: 'network',
};

function classify(input: MapErrorInput): ErrorCode {
  if (input.spawnError) {
    return SPAWN_ERROR_MAP[input.spawnError.code ?? ''] ?? 'unknown';
  }
  if (EXIT_CODE_MAP[input.exitCode]) return EXIT_CODE_MAP[input.exitCode];
  if (/\b(401|403)\b/.test(input.stderr)) return 'auth';
  if (/\b429\b/.test(input.stderr)) return 'rate_limit';
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(input.stderr)) return 'network';
  return 'unknown';
}

export function mapError(input: MapErrorInput): ConversationError {
  const code = classify(input);
  const stderr = input.stderr.trim();
  const message =
    stderr.length > 0
      ? stderr.split('\n').slice(-5).join('\n')
      : ERROR_MESSAGES[code];
  return { code, message };
}
