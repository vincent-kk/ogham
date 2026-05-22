import type {
  ConversationError,
  GeminiSandboxBackend,
} from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { spawnGemini } from '../operations/spawn.js';

import { normalizeResponse } from './normalizeResponse.js';

export interface PromptCallResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationError | null;
  timedOut?: boolean;
}

export interface CallGeminiOptions {
  sandboxBackend?: GeminiSandboxBackend;
  timeoutMs?: number;
}

export async function callGemini(
  cwd: string,
  argv: string[],
  options: CallGeminiOptions = {},
): Promise<PromptCallResult> {
  const result = await spawnGemini(argv, {
    cwd,
    sandboxBackend: options.sandboxBackend,
    timeoutMs: options.timeoutMs,
  });
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
  return {
    status: 'success',
    response: normalizeResponse(result.stdout),
    error: null,
  };
}
