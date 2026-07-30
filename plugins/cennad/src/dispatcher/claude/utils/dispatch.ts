import type {
  ConversationOptions,
  DispatchResult,
} from '../../../types/index.js';
import { withActiveRun } from '../../activeRuns/withActiveRun.js';
import { mapError } from '../../errorMap/index.js';
import { computeIgnoredOptions } from '../../utils/computeIgnoredOptions.js';
import { spawnClaude } from '../operations/spawn.js';

import { cliFailureMessage } from './cliFailureMessage.js';
import { parseResult } from './parseResult.js';

export interface ClaudeDispatchInternal {
  argv: string[];
  cwd: string;
  options: ConversationOptions;
  externalSessionRef: string;
  supportedOptions: ReadonlySet<keyof ConversationOptions>;
  idleTimeoutMs: number;
  hardCapMs: number;
  resolvedModel: string;
  // cennad session UUID — the key this run is filed under while it is in flight,
  // so `stop_conversation` can name it. Not the same as `externalSessionRef` on
  // resume, where that one holds claude's own session reference.
  sessionId: string;
  // The caller's cancellation signal, when the MCP request carried one.
  signal?: AbortSignal;
}

export async function dispatch(
  input: ClaudeDispatchInternal,
): Promise<DispatchResult> {
  const ignoredOptions = computeIgnoredOptions(
    input.options,
    input.supportedOptions,
  );
  const spawnResult = await withActiveRun(
    {
      sessionId: input.sessionId,
      provider: 'claude',
      callerSignal: input.signal,
    },
    (signal) =>
      spawnClaude(input.argv, {
        cwd: input.cwd,
        timeoutMs: input.hardCapMs,
        idleTimeoutMs: input.idleTimeoutMs,
        signal,
      }),
  );
  const failed = spawnResult.spawnError !== null || spawnResult.exitCode !== 0;

  // Before the generic failure branch: a stopped run's stream is a truncated
  // one, and reading it would report whatever it was doing as the reason.
  if (spawnResult.cancelled)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: spawnResult.exitCode,
        stderr: spawnResult.stderr,
        cancelled: true,
      }),
      externalSessionRef: input.externalSessionRef,
      ignoredOptions,
      resolvedModel: input.resolvedModel,
    };

  if (failed)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: spawnResult.exitCode,
        stderr: spawnResult.stderr,
        cliMessage: cliFailureMessage(spawnResult.stdout),
        spawnError: spawnResult.spawnError,
        abortedByCaller: spawnResult.abortedByCaller,
      }),
      externalSessionRef: input.externalSessionRef,
      ignoredOptions,
      resolvedModel: input.resolvedModel,
    };

  const parsed = parseResult(spawnResult.stdout);
  if (parsed.error !== null)
    return {
      status: 'failure',
      response: parsed.response,
      error: { code: 'unknown', message: parsed.error },
      externalSessionRef: input.externalSessionRef,
      ignoredOptions,
      resolvedModel: input.resolvedModel,
    };

  return {
    status: 'success',
    response: parsed.response,
    error: null,
    externalSessionRef: input.externalSessionRef,
    ignoredOptions,
    resolvedModel: input.resolvedModel,
  };
}
