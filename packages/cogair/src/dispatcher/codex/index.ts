import type {
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../types/index.js';
import { mapError } from '../errorMap.js';

import { parseCodexStream } from './jsonlParser.js';
import { resolveCodexModel } from './modelAlias.js';
import { spawnCodex } from './spawn.js';

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

function computeIgnoredOptions(options: ConversationOptions): string[] {
  return Object.keys(options).filter(
    (key) => !supportedOptions.has(key as keyof ConversationOptions),
  );
}

function buildStartArgs(args: DispatchOptions): string[] {
  const argv = [
    'exec',
    '--skip-git-repo-check',
    '--ask-for-approval',
    'never',
    '--sandbox',
    'read-only',
  ];
  const model = resolveCodexModel(args.model);
  if (model) argv.push('-m', model);
  argv.push(args.prompt);
  return argv;
}

function buildResumeArgs(args: DispatchResumeOptions): string[] {
  const argv = ['exec', 'resume'];
  const model = resolveCodexModel(args.model);
  if (model) argv.push('-m', model);
  argv.push(args.externalSessionRef, args.prompt);
  return argv;
}

interface DispatchInternal {
  argv: string[];
  cwd: string;
  options: ConversationOptions;
  existingRef: string | null;
}

async function dispatch(input: DispatchInternal): Promise<DispatchResult> {
  const ignoredOptions = computeIgnoredOptions(input.options);
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

export const codexDispatcher: Dispatcher = {
  supportedOptions,
  async start(args: DispatchOptions): Promise<DispatchResult> {
    return dispatch({
      argv: buildStartArgs(args),
      cwd: args.cwd,
      options: args.options,
      existingRef: null,
    });
  },
  async resume(args: DispatchResumeOptions): Promise<DispatchResult> {
    return dispatch({
      argv: buildResumeArgs(args),
      cwd: args.cwd,
      options: args.options,
      existingRef: args.externalSessionRef,
    });
  },
};
