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
    await rm(cwd, { recursive: true, force: true });
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
    const model = resolveAntigravityModel(args.model, args.modelMap);
    const since = Date.now();
    const callResult = await callAgy(cwd, buildStartArgs(args, model), {
      timeoutMs: args.spawnTimeoutMs,
      since,
    });
    if (callResult.status === 'failure' && callResult.timedOut) {
      void cleanupCwdOnTimeout(cwd);
    }
    return {
      status: callResult.status,
      response: callResult.response,
      error: callResult.error,
      externalSessionRef: cwd,
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
    // ensureCwd(sessionId) is deterministic, so this equals the stored
    // externalSessionRef that start() recorded — single durable session cwd.
    const cwd = await ensureCwd(args.sessionId);
    const model = resolveAntigravityModel(args.model, args.modelMap);
    const since = Date.now();
    const callResult = await callAgy(cwd, buildResumeArgs(args, model), {
      timeoutMs: args.spawnTimeoutMs,
      since,
    });
    // Unlike start(), do NOT delete the cwd on resume timeout: it holds this
    // session's agy conversation history. Removing it would make a later
    // --continue silently begin a fresh conversation (lost context).
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
