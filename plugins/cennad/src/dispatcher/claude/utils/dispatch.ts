import type {
  ConversationOptions,
  DispatchResult,
} from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { computeIgnoredOptions } from '../../utils/computeIgnoredOptions.js';
import { spawnClaude } from '../operations/spawn.js';

import { parseResult } from './parseResult.js';

export interface ClaudeDispatchInternal {
  argv: string[];
  cwd: string;
  options: ConversationOptions;
  externalSessionRef: string;
  supportedOptions: ReadonlySet<keyof ConversationOptions>;
  spawnTimeoutMs: number;
  resolvedModel: string;
}

export async function dispatch(
  input: ClaudeDispatchInternal,
): Promise<DispatchResult> {
  const ignoredOptions = computeIgnoredOptions(
    input.options,
    input.supportedOptions,
  );
  const spawnResult = await spawnClaude(input.argv, {
    cwd: input.cwd,
    timeoutMs: input.spawnTimeoutMs,
  });
  const failed = spawnResult.spawnError !== null || spawnResult.exitCode !== 0;

  if (failed)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: spawnResult.exitCode,
        stderr: spawnResult.stderr,
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
