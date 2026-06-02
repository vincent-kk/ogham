import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { writeArtifact } from '../../../core/artifactWriter/index.js';
import { loadConfig } from '../../../core/configManager/index.js';
import { incrementCounter } from '../../../core/counterManager/index.js';
import { getProjectHash } from '../../../core/projectHash/index.js';
import { createSession } from '../../../core/sessionStore/index.js';
import {
  buildResponse,
  composePrompt,
  dispatchers,
} from '../../../dispatcher/index.js';
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

  if (!config.ratio[input.provider].enabled) {
    return {
      status: 'failure',
      session_id: sessionId,
      provider: input.provider,
      response: null,
      error: {
        code: 'disabled',
        message: `Provider '${input.provider}' is disabled in cogair config. Enable it via /cogair:setup before dispatching, or route to the other provider.`,
      },
      meta: {
        turn: 0,
        created_at: isoNow(),
        elapsed_ms: Math.round(performance.now() - startedAt),
        ignored_options: [],
      },
    };
  }

  const cwd = process.cwd();
  const model: ModelAlias = input.model ?? config.default_model;
  const options = {};

  await incrementCounter(input.provider);

  const composedPrompt = composePrompt({
    prompt: input.prompt,
    preamble: config.preamble[input.provider],
    recencyLevel: config.recency_factor[input.provider],
  });

  const result: DispatchResult =
    input.provider === 'codex'
      ? await dispatchers.codex.start({
          prompt: composedPrompt,
          model,
          options,
          sessionId,
          cwd,
          flags: config.option_flags.codex,
          spawnTimeoutMs: config.spawn_timeout_ms,
        })
      : await dispatchers.gemini.start({
          prompt: composedPrompt,
          model,
          options,
          sessionId,
          cwd,
          flags: config.option_flags.gemini,
          spawnTimeoutMs: config.spawn_timeout_ms,
        });

  await createSession({
    sessionId,
    provider: input.provider,
    cwd,
    externalSessionRef: result.externalSessionRef,
    model: result.resolvedModel ?? model,
    options,
  });

  const createdAt = isoNow();
  let artifactPath: string | undefined;
  if (
    config.artifacts.enabled &&
    result.status === 'success' &&
    result.response !== null
  ) {
    artifactPath = await writeArtifact({
      artifacts: config.artifacts,
      cwd,
      projectHash: getProjectHash(cwd),
      sessionId,
      turn: 1,
      provider: input.provider,
      model: result.resolvedModel ?? model,
      createdAt,
      elapsedMs: Math.round(performance.now() - startedAt),
      prompt: input.prompt,
      composedPrompt,
      response: result.response,
    });
  }

  return buildResponse({
    sessionId,
    provider: input.provider,
    result,
    turn: 1,
    createdAt,
    startedAt,
    artifactPath,
  });
}
