import type {
  CodexFlags,
  ConversationOptions,
  DispatchOptions,
  DispatchResult,
  DispatchResumeOptions,
  Dispatcher,
} from '../../../types/index.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';
import { dispatch } from '../utils/dispatch.js';

const supportedOptions: ReadonlySet<keyof ConversationOptions> = new Set();

export const codexDispatcher: Dispatcher<CodexFlags> = {
  supportedOptions,
  async start(args: DispatchOptions<CodexFlags>): Promise<DispatchResult> {
    return dispatch({
      argv: buildStartArgs(args),
      cwd: args.cwd,
      options: args.options,
      existingRef: null,
      supportedOptions,
    });
  },
  async resume(
    args: DispatchResumeOptions<CodexFlags>,
  ): Promise<DispatchResult> {
    return dispatch({
      argv: buildResumeArgs(args),
      cwd: args.cwd,
      options: args.options,
      existingRef: args.externalSessionRef,
      supportedOptions,
    });
  },
};
