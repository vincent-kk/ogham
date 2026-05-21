import { performance } from 'node:perf_hooks';

import { incrementCounter } from '../../../core/counterManager/index.js';
import { getProjectHash } from '../../../core/projectHash/index.js';
import { getSession, updateSession } from '../../../core/sessionStore/index.js';
import { buildResponse, dispatchers } from '../../../dispatcher/index.js';
import type { ConversationResponse } from '../../../types/index.js';
import { isoNow } from '../../../utils/isoNow.js';

export interface ContinueConversationInput {
  session_id: string;
  prompt: string;
}

export async function handleContinueConversation(
  input: ContinueConversationInput,
): Promise<ConversationResponse> {
  const startedAt = performance.now();
  const cwd = process.cwd();
  const projectHash = getProjectHash(cwd);

  const session = await getSession(projectHash, input.session_id);
  if (!session) {
    return {
      status: 'failure',
      session_id: input.session_id,
      provider: 'codex',
      response: null,
      error: {
        code: 'unknown',
        message: 'Session not found in the current project',
      },
      meta: {
        turn: 0,
        created_at: isoNow(),
        elapsed_ms: Math.round(performance.now() - startedAt),
        ignored_options: [],
      },
    };
  }

  await incrementCounter(session.provider);

  const result = await dispatchers[session.provider].resume({
    prompt: input.prompt,
    model: 'auto',
    options: {},
    sessionId: session.session_id,
    cwd: session.cwd,
    externalSessionRef: session.external_session_ref,
  });

  const nextTurn = session.turn_count + 1;
  await updateSession({
    ...session,
    last_used_at: isoNow(),
    turn_count: nextTurn,
  });

  return buildResponse({
    sessionId: session.session_id,
    provider: session.provider,
    result,
    turn: nextTurn,
    createdAt: isoNow(),
    startedAt,
  });
}
