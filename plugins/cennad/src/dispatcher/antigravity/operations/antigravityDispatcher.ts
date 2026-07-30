import { rm } from 'node:fs/promises';

import { logger } from '../../../lib/logger.js';
import type {
  AntigravityFlags,
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../../types/index.js';
import { computeIgnoredOptions } from '../../utils/computeIgnoredOptions.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';
import { callAgy } from '../utils/callAgy.js';
import { ensureCwd } from '../utils/ensureCwd.js';

import { resolveAntigravityModel } from './modelAlias.js';

async function cleanupCwdOnTimeout(cwd: string): Promise<void> {
  try {
    await rm(cwd, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  } catch (err) {
    logger.warn('antigravity cwd cleanup failed after timeout', {
      cwd,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

export const antigravityDispatcher: Dispatcher<AntigravityFlags> = {
  supportedOptions,
  async start(
    args: DispatchOptions<AntigravityFlags>,
  ): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(
      args.options,
      supportedOptions,
    );
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveAntigravityModel(args.tier, args.modelMap);
    const since = Date.now();
    const callResult = await callAgy(cwd, buildStartArgs(args, model), {
      timeoutMs: args.hardCapMs,
      idleTimeoutMs: args.idleTimeoutMs,
      since,
      sessionId: args.sessionId,
      signal: args.signal,
    });
    if (callResult.status === 'failure' && callResult.timedOut)
      void cleanupCwdOnTimeout(cwd);
    return {
      status: callResult.status,
      response: callResult.response,
      error: callResult.error,
      // agy's own conversation id when the stream carried it — resume then targets
      // that conversation directly. Without it (older agy, or a run recovered from
      // the transcript) the isolated cwd remains the ref and resume uses --continue.
      externalSessionRef: callResult.conversationId ?? cwd,
      ignoredOptions,
      resolvedModel: model,
    };
  },
  async resume(
    args: DispatchResumeOptions<AntigravityFlags>,
  ): Promise<DispatchResult> {
    const ignoredOptions = computeIgnoredOptions(
      args.options,
      supportedOptions,
    );
    // The cwd is where agy runs, not the session ref: a ref recorded before agy
    // reported conversation ids is that cwd, a newer one is the id itself.
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveAntigravityModel(args.tier, args.modelMap);
    const since = Date.now();
    const callResult = await callAgy(cwd, buildResumeArgs(args, model), {
      timeoutMs: args.hardCapMs,
      idleTimeoutMs: args.idleTimeoutMs,
      since,
      sessionId: args.sessionId,
      signal: args.signal,
    });
    // Unlike start(), do NOT delete the cwd on resume timeout: it holds this
    // session's agy conversation history. Removing it would make a later
    // --continue silently begin a fresh conversation (lost context).
    return {
      status: callResult.status,
      response: callResult.response,
      error: callResult.error,
      // Promote a legacy cwd ref the moment the stream names the conversation;
      // without it every later resume keeps aiming at "the newest conversation in
      // this directory", which anything else running there can take over.
      externalSessionRef: callResult.conversationId ?? args.externalSessionRef,
      ignoredOptions,
      resolvedModel: model,
    };
  },
};
