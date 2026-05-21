import type { ErrorCode } from '../../../types/index.js';
import { EXIT_CODE_MAP, SPAWN_ERROR_MAP } from '../constants/codeMaps.js';

export interface MapErrorInput {
  exitCode: number;
  stderr: string;
  spawnError?: NodeJS.ErrnoException | null;
}

export function classify(input: MapErrorInput): ErrorCode {
  if (input.spawnError) {
    return SPAWN_ERROR_MAP[input.spawnError.code ?? ''] ?? 'unknown';
  }
  if (EXIT_CODE_MAP[input.exitCode]) return EXIT_CODE_MAP[input.exitCode];
  if (/\b(401|403)\b/.test(input.stderr)) return 'auth';
  if (/\b429\b/.test(input.stderr)) return 'rate_limit';
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(input.stderr)) return 'network';
  return 'unknown';
}
