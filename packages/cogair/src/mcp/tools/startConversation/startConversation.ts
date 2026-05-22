import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { loadConfig } from '../../../core/configManager/index.js';
import { incrementCounter } from '../../../core/counterManager/index.js';
import { createSession } from '../../../core/sessionStore/index.js';
import { buildResponse, dispatchers } from '../../../dispatcher/index.js';
import type {
  ConversationResponse,
  DispatchResult,
  ModelAlias,
  Provider,
} from '../../../types/index.js';
import { isoNow } from '../../../utils/isoNow.js';

export interface StartConversationInput {
  provider: Provider;
  prompt: string;
  model?: ModelAlias;
}

export async function handleStartConversation(
  input: StartConversationInput,
): Promise<ConversationResponse> {
  const startedAt = performance.now();
  const config = await loadConfig();
  const sessionId = randomUUID();
  const cwd = process.cwd();
  const model: ModelAlias = input.model ?? config.default_model;
  const options = {};

  await incrementCounter(input.provider);

  const result: DispatchResult =
    input.provider === 'codex'
      ? await dispatchers.codex.start({
          prompt: input.prompt,
          model,
          options,
          sessionId,
          cwd,
          flags: config.option_flags.codex,
        })
      : await dispatchers.gemini.start({
          prompt: input.prompt,
          model,
          options,
          sessionId,
          cwd,
          flags: config.option_flags.gemini,
        });

  await createSession({
    sessionId,
    provider: input.provider,
    cwd,
    externalSessionRef: result.externalSessionRef,
    model: result.resolvedModel ?? model,
    options,
  });

  return buildResponse({
    sessionId,
    provider: input.provider,
    result,
    turn: 1,
    createdAt: isoNow(),
    startedAt,
  });
}
