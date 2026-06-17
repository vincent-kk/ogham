import { rm } from 'node:fs/promises';

import { logger } from '../../../lib/logger.js';
import type {
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
  GeminiFlags,
} from '../../../types/index.js';
import { computeIgnoredOptions } from '../../utils/computeIgnoredOptions.js';
import { buildPromptArgs } from '../utils/buildPromptArgs.js';
import { callGemini } from '../utils/callGemini.js';
import { captureSessionUuid } from '../utils/captureSessionUuid.js';
import { ensureCwd } from '../utils/ensureCwd.js';
import { resolveResumeIndex } from '../utils/resolveResumeIndex.js';

import { resolveGeminiModel } from './modelAlias.js';

async function cleanupCwdOnTimeout(cwd: string): Promise<void> {
  try {
    await rm(cwd, { recursive: true, force: true });
  } catch (err) {
    logger.warn('gemini cwd cleanup failed after timeout', {
      cwd,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

export const geminiDispatcher: Dispatcher<GeminiFlags> = {
  supportedOptions,
  async start(args: DispatchOptions<GeminiFlags>): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(
      args.options,
      supportedOptions,
    );
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveGeminiModel(args.tier);

    const callResult = await callGemini(
      cwd,
      buildPromptArgs({ model, prompt: args.prompt, flags: args.flags }),
      {
        sandbox: args.flags.sandbox,
        sandboxBackend: args.flags.sandbox_backend,
        timeoutMs: args.spawnTimeoutMs,
      },
    );
    if (callResult.status === 'failure') {
      if (callResult.timedOut) {
        void cleanupCwdOnTimeout(cwd);
      }
      return {
        status: 'failure',
        response: null,
        error: callResult.error,
        externalSessionRef: '',
        ignoredOptions,
        resolvedModel: model,
      };
    }

    const capture = await captureSessionUuid(cwd, args.spawnTimeoutMs);
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

  async resume(
    args: DispatchResumeOptions<GeminiFlags>,
  ): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(
      args.options,
      supportedOptions,
    );
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveGeminiModel(args.tier);

    const resolved = await resolveResumeIndex(
      cwd,
      args.externalSessionRef,
      args.spawnTimeoutMs,
    );
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
      buildPromptArgs({
        model,
        prompt: args.prompt,
        flags: args.flags,
        resumeIndex: resolved.index,
      }),
      {
        sandbox: args.flags.sandbox,
        sandboxBackend: args.flags.sandbox_backend,
        timeoutMs: args.spawnTimeoutMs,
      },
    );
    if (callResult.timedOut) {
      void cleanupCwdOnTimeout(cwd);
    }
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
