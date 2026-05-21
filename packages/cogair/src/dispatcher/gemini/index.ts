import { mkdir } from 'node:fs/promises';

import { DIR_MODE } from '../../constants/defaults.js';
import { geminiCwdPath } from '../../constants/paths.js';
import type {
  ConversationError,
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../types/index.js';
import { mapError } from '../errorMap.js';

import { resolveGeminiModel } from './modelAlias.js';
import {
  findLatestSession,
  findSessionByUuid,
  parseListSessions,
} from './sessionResolver.js';
import { spawnGemini } from './spawn.js';

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

function computeIgnoredOptions(options: ConversationOptions): string[] {
  return Object.keys(options).filter(
    (key) => !supportedOptions.has(key as keyof ConversationOptions),
  );
}

async function ensureCwd(sessionId: string): Promise<string> {
  const cwd = geminiCwdPath(sessionId);
  await mkdir(cwd, { recursive: true, mode: DIR_MODE });
  return cwd;
}

function buildPromptArgs(
  model: string | null,
  prompt: string,
  resumeIndex?: number,
): string[] {
  const argv: string[] = [];
  if (resumeIndex !== undefined) argv.push('--resume', String(resumeIndex));
  if (model) argv.push('-m', model);
  argv.push('-p', prompt);
  return argv;
}

function normalizeResponse(stdout: string): string | null {
  const trimmed = stdout.replace(/\n+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

interface PromptCallResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationError | null;
}

async function callGemini(
  cwd: string,
  argv: string[],
): Promise<PromptCallResult> {
  const result = await spawnGemini(argv, { cwd });
  if (result.spawnError !== null || result.exitCode !== 0) {
    return {
      status: 'failure',
      response: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        spawnError: result.spawnError,
      }),
    };
  }
  return {
    status: 'success',
    response: normalizeResponse(result.stdout),
    error: null,
  };
}

async function captureSessionUuid(
  cwd: string,
): Promise<{ uuid: string | null; error: ConversationError | null }> {
  const result = await spawnGemini(['--list-sessions'], { cwd });
  if (result.spawnError !== null || result.exitCode !== 0) {
    return {
      uuid: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        spawnError: result.spawnError,
      }),
    };
  }
  const latest = findLatestSession(parseListSessions(result.stdout));
  if (!latest) {
    return {
      uuid: null,
      error: {
        code: 'unknown',
        message: 'gemini --list-sessions returned no entries after start',
      },
    };
  }
  return { uuid: latest.sessionId, error: null };
}

async function resolveResumeIndex(
  cwd: string,
  uuid: string,
): Promise<{ index: number | null; error: ConversationError | null }> {
  const result = await spawnGemini(['--list-sessions'], { cwd });
  if (result.spawnError !== null || result.exitCode !== 0) {
    return {
      index: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        spawnError: result.spawnError,
      }),
    };
  }
  const entry = findSessionByUuid(parseListSessions(result.stdout), uuid);
  if (!entry) {
    return {
      index: null,
      error: {
        code: 'unknown',
        message:
          'gemini session UUID not found in current --list-sessions output',
      },
    };
  }
  return { index: entry.index, error: null };
}

export const geminiDispatcher: Dispatcher = {
  supportedOptions,
  async start(args: DispatchOptions): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(args.options);
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveGeminiModel(args.model);

    const callResult = await callGemini(
      cwd,
      buildPromptArgs(model, args.prompt),
    );
    if (callResult.status === 'failure') {
      return {
        status: 'failure',
        response: null,
        error: callResult.error,
        externalSessionRef: '',
        ignoredOptions,
        resolvedModel: model,
      };
    }

    const capture = await captureSessionUuid(cwd);
    if (capture.uuid === null) {
      return {
        status: 'failure',
        response: callResult.response,
        error: capture.error,
        externalSessionRef: '',
        ignoredOptions,
        resolvedModel: model,
      };
    }

    return {
      status: 'success',
      response: callResult.response,
      error: null,
      externalSessionRef: capture.uuid,
      ignoredOptions,
      resolvedModel: model,
    };
  },

  async resume(args: DispatchResumeOptions): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(args.options);
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveGeminiModel(args.model);

    const resolved = await resolveResumeIndex(cwd, args.externalSessionRef);
    if (resolved.index === null) {
      return {
        status: 'failure',
        response: null,
        error: resolved.error,
        externalSessionRef: args.externalSessionRef,
        ignoredOptions,
        resolvedModel: model,
      };
    }

    const callResult = await callGemini(
      cwd,
      buildPromptArgs(model, args.prompt, resolved.index),
    );
    return {
      status: callResult.status,
      response: callResult.response,
      error: callResult.error,
      externalSessionRef: args.externalSessionRef,
      ignoredOptions,
      resolvedModel: model,
    };
  },
};
