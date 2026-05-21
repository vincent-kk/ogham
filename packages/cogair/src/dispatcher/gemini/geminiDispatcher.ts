import type {
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../types/index.js';
import { computeIgnoredOptions } from '../utils/computeIgnoredOptions.js';

import { resolveGeminiModel } from './modelAlias.js';
import { buildPromptArgs } from './utils/buildPromptArgs.js';
import { callGemini } from './utils/callGemini.js';
import { captureSessionUuid } from './utils/captureSessionUuid.js';
import { ensureCwd } from './utils/ensureCwd.js';
import { resolveResumeIndex } from './utils/resolveResumeIndex.js';

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

export const geminiDispatcher: Dispatcher = {
  supportedOptions,
  async start(args: DispatchOptions): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(
      args.options,
      supportedOptions,
    );
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
    const ignoredOptions = computeIgnoredOptions(
      args.options,
      supportedOptions,
    );
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
