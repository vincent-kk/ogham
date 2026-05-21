import type {
  ConversationOptions,
  DispatchResult,
} from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { computeIgnoredOptions } from '../../utils/computeIgnoredOptions.js';
import { parseCodexStream } from '../jsonlParser/index.js';
import { spawnCodex } from '../spawn.js';

export interface DispatchInternal {
  argv: string[];
  cwd: string;
  options: ConversationOptions;
  existingRef: string | null;
  supportedOptions: ReadonlySet<keyof ConversationOptions>;
}

export async function dispatch(
  input: DispatchInternal,
): Promise<DispatchResult> {
  const ignoredOptions = computeIgnoredOptions(
    input.options,
    input.supportedOptions,
  );
  const spawnResult = await spawnCodex(input.argv, { cwd: input.cwd });
  const parsed = parseCodexStream(spawnResult.stdout);
  const resolvedRef = input.existingRef ?? parsed.threadId ?? '';
  const failed = spawnResult.spawnError !== null || spawnResult.exitCode !== 0;

  if (failed) {
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: spawnResult.exitCode,
        stderr: spawnResult.stderr,
        spawnError: spawnResult.spawnError,
      }),
      externalSessionRef: resolvedRef,
      ignoredOptions,
      resolvedModel: parsed.resolvedModel,
    };
  }

  if (input.existingRef === null && !parsed.threadId) {
    return {
      status: 'failure',
      response: parsed.response,
      error: {
        code: 'unknown',
        message: 'codex completed without emitting a thread id',
      },
      externalSessionRef: '',
      ignoredOptions,
      resolvedModel: parsed.resolvedModel,
    };
  }

  return {
    status: 'success',
    response: parsed.response,
    error: null,
    externalSessionRef: resolvedRef,
    ignoredOptions,
    resolvedModel: parsed.resolvedModel,
  };
}
