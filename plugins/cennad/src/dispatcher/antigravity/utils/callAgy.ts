import type { ConversationError } from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { spawnAgy } from '../operations/spawn.js';

import { emptyOutputMessage } from './emptyOutputMessage.js';
import { findAgyConversationId } from './findAgyConversationId.js';
import { findAgyError } from './findAgyError.js';
import { parseJsonOutput } from './parseJsonOutput.js';
import { resolveTranscript } from './resolveTranscript.js';

export interface AgyCallResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationError | null;
  timedOut?: boolean;
  // Present whenever agy's stream carried it; null when it did not (empty stdout,
  // spawn failure), where the caller keeps the cwd as the session ref instead.
  conversationId?: string | null;
}

export interface CallAgyOptions {
  timeoutMs?: number;
  idleTimeoutMs?: number;
  since: number;
}

export async function callAgy(
  cwd: string,
  argv: string[],
  options: CallAgyOptions,
): Promise<AgyCallResult> {
  const result = await spawnAgy(argv, {
    cwd,
    timeoutMs: options.timeoutMs,
    idleTimeoutMs: options.idleTimeoutMs,
  });
  if (result.spawnError !== null || result.exitCode !== 0)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        cliMessage: findAgyError(result.stdout),
        spawnError: result.spawnError,
      }),
      timedOut: result.spawnError?.code === 'ETIMEDOUT',
    };

  const conversationId = findAgyConversationId(result.stdout);
  const parsed = parseJsonOutput(result.stdout);
  if (parsed !== null)
    return { status: 'success', response: parsed, error: null, conversationId };

  // agy can report a failed turn and still exit 0, with the reason in the stream's
  // result event. Reading the transcript for such a run would return the previous
  // turn's answer as this turn's success.
  const cliMessage = findAgyError(result.stdout);
  if (cliMessage !== null)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        cliMessage,
      }),
      conversationId,
    };

  const fallback = await resolveTranscript(cwd, options.since);
  if (fallback !== null)
    return {
      status: 'success',
      response: fallback,
      error: null,
      conversationId,
    };

  return {
    status: 'failure',
    response: null,
    error: {
      code: 'cli_error',
      message: emptyOutputMessage(result.stderr),
    },
  };
}
