import type {
  CodexFlags,
  CodexModelMap,
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../../types/index.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';
import { dispatch } from '../utils/dispatch.js';

import { resolveCodexTier } from './resolveTier.js';

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

export const codexDispatcher: Dispatcher<CodexFlags, CodexModelMap> = {
  supportedOptions,
  async start(
    args: DispatchOptions<CodexFlags, CodexModelMap>,
  ): Promise<DispatchResult> {
    return dispatch({
      argv: buildStartArgs(args, resolveCodexTier(args.tier, args.modelMap)),
      cwd: args.cwd,
      options: args.options,
      existingRef: null,
      supportedOptions,
      spawnTimeoutMs: args.spawnTimeoutMs,
    });
  },
  async resume(
    args: DispatchResumeOptions<CodexFlags, CodexModelMap>,
  ): Promise<DispatchResult> {
    return dispatch({
      argv: buildResumeArgs(args, resolveCodexTier(args.tier, args.modelMap)),
      cwd: args.cwd,
      options: args.options,
      existingRef: args.externalSessionRef,
      supportedOptions,
      spawnTimeoutMs: args.spawnTimeoutMs,
    });
  },
};
