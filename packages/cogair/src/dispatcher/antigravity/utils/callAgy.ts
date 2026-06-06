import type { ConversationError } from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { spawnAgy } from '../operations/spawn.js';

import { parseJsonOutput } from './parseJsonOutput.js';
import { resolveTranscript } from './resolveTranscript.js';

export interface AgyCallResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationError | null;
  timedOut?: boolean;
}

export interface CallAgyOptions {
  timeoutMs?: number;
  since: number;
}

export async function callAgy(
  cwd: string,
  argv: string[],
  options: CallAgyOptions,
): Promise<AgyCallResult> {
  const result = await spawnAgy(argv, { cwd, timeoutMs: options.timeoutMs });
  if (result.spawnError !== null || result.exitCode !== 0) {
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        spawnError: result.spawnError,
      }),
      timedOut: result.spawnError?.code === 'ETIMEDOUT',
    };
  }
  const parsed = parseJsonOutput(result.stdout);
  if (parsed !== null) {
    return { status: 'success', response: parsed, error: null };
  }
  const fallback = await resolveTranscript(cwd, options.since);
  if (fallback !== null) {
    return { status: 'success', response: fallback, error: null };
  }
  return {
    status: 'failure',
    response: null,
    error: {
      code: 'cli_error',
      message:
        'agy returned no output and the response could not be recovered. Try again, or update the agy CLI.',
    },
  };
}
