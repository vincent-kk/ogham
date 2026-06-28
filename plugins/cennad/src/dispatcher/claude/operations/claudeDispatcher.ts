import type {
  ClaudeFlags,
  ClaudeModelMap,
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../../types/index.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';
import { dispatch } from '../utils/dispatch.js';

import { resolveClaudeTier } from './resolveTier.js';

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

export const claudeDispatcher: Dispatcher<ClaudeFlags, ClaudeModelMap> = {
  supportedOptions,
  async start(
    args: DispatchOptions<ClaudeFlags, ClaudeModelMap>,
  ): Promise<DispatchResult> {
    const resolved = resolveClaudeTier(args.tier, args.modelMap);
    return dispatch({
      argv: buildStartArgs(args, resolved),
      cwd: args.cwd,
      options: args.options,
      // D5: --session-id injects the cennad sessionId, so the external ref is the
      // sessionId itself — no output parsing needed.
      externalSessionRef: args.sessionId,
      supportedOptions,
      spawnTimeoutMs: args.spawnTimeoutMs,
      resolvedModel: resolved.model,
    });
  },
  async resume(
    args: DispatchResumeOptions<ClaudeFlags, ClaudeModelMap>,
  ): Promise<DispatchResult> {
    const resolved = resolveClaudeTier(args.tier, args.modelMap);
    return dispatch({
      argv: buildResumeArgs(args, resolved),
      cwd: args.cwd,
      options: args.options,
      externalSessionRef: args.externalSessionRef,
      supportedOptions,
      spawnTimeoutMs: args.spawnTimeoutMs,
      resolvedModel: resolved.model,
    });
  },
};
