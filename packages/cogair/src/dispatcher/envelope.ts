import { performance } from 'node:perf_hooks';

import type {
  ConversationResponse,
  DispatchResult,
  Provider,
} from '../types/index.js';

export interface BuildResponseArgs {
  sessionId: string;
  provider: Provider;
  result: DispatchResult;
  turn: number;
  createdAt: string;
  startedAt: number;
}

export function buildResponse(args: BuildResponseArgs): ConversationResponse {
  return {
    status: args.result.status,
    session_id: args.sessionId,
    provider: args.provider,
    response: args.result.response,
    error: args.result.error,
    meta: {
      turn: args.turn,
      created_at: args.createdAt,
      elapsed_ms: Math.round(performance.now() - args.startedAt),
      ignored_options: args.result.ignoredOptions,
    },
  };
}
