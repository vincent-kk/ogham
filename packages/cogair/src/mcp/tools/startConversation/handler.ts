import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { loadConfig } from '../../../core/configManager/index.js';
import { incrementCounter } from '../../../core/counterManager/index.js';
import { createSession } from '../../../core/sessionStore/index.js';
import { buildResponse } from '../../../dispatcher/envelope.js';
import { dispatchers } from '../../../dispatcher/index.js';
import type {
  ConversationOptions,
  ConversationResponse,
  ModelAlias,
  Provider,
} from '../../../types/index.js';
import { isoNow } from '../../../utils/isoNow.js';

export interface StartConversationInput {
  provider: Provider;
  prompt: string;
  model?: ModelAlias;
  options?: ConversationOptions;
}

export async function handleStartConversation(
  input: StartConversationInput,
): Promise<ConversationResponse> {
  const startedAt = performance.now();
  const config = await loadConfig();
  const sessionId = randomUUID();
  const cwd = process.cwd();
  const model: ModelAlias = input.model ?? config.default_model;
  const options: ConversationOptions = input.options ?? config.default_options;

  await incrementCounter(input.provider);

  const result = await dispatchers[input.provider].start({
    prompt: input.prompt,
    model,
    options,
    sessionId,
    cwd,
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
