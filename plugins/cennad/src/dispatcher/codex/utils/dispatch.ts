import type {
  ConversationOptions,
  DispatchResult,
} from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { computeIgnoredOptions } from '../../utils/computeIgnoredOptions.js';
import { parseCodexStream } from '../jsonlParser/index.js';
import { spawnCodex } from '../operations/spawn.js';

export interface DispatchInternal {
  argv: string[];
  cwd: string;
  options: ConversationOptions;
  existingRef: string | null;
  supportedOptions: ReadonlySet<keyof ConversationOptions>;
  idleTimeoutMs: number;
  hardCapMs: number;
  // What the tier resolved to, used when the stream names no model — codex
  // reports one only sometimes, and a null here gets stored as a tier label.
  tierModel: string | null;
}

export async function dispatch(
  input: DispatchInternal,
): Promise<DispatchResult> {
  const ignoredOptions = computeIgnoredOptions(
    input.options,
    input.supportedOptions,
  );
  const spawnResult = await spawnCodex(input.argv, {
    cwd: input.cwd,
    timeoutMs: input.hardCapMs,
    idleTimeoutMs: input.idleTimeoutMs,
  });
  const parsed = parseCodexStream(spawnResult.stdout);
  const resolvedModel = parsed.resolvedModel ?? input.tierModel;
  const resolvedRef = input.existingRef ?? parsed.threadId ?? '';
  const failed = spawnResult.spawnError !== null || spawnResult.exitCode !== 0;

  if (failed)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: spawnResult.exitCode,
        stderr: spawnResult.stderr,
        cliMessage: parsed.errorMessage,
        spawnError: spawnResult.spawnError,
        abortedByCaller: spawnResult.abortedByCaller,
      }),
      externalSessionRef: resolvedRef,
      ignoredOptions,
      resolvedModel,
    };

  // codex can report a failed turn and still exit 0, with the reason only in the
  // stream. A turn that produced no message and named a reason is that case; an
  // `error` event beside a delivered answer is a notice and keeps the success.
  if (parsed.response === null && parsed.errorMessage !== null)
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: spawnResult.exitCode,
        stderr: spawnResult.stderr,
        cliMessage: parsed.errorMessage,
      }),
      externalSessionRef: resolvedRef,
      ignoredOptions,
      resolvedModel,
    };

  if (input.existingRef === null && !parsed.threadId)
    return {
      status: 'failure',
      response: parsed.response,
      error: {
        code: 'unknown',
        message: 'codex completed without emitting a thread id',
      },
      externalSessionRef: '',
      ignoredOptions,
      resolvedModel,
    };

  return {
    status: 'success',
    response: parsed.response,
    error: null,
    externalSessionRef: resolvedRef,
    ignoredOptions,
    resolvedModel,
  };
}
