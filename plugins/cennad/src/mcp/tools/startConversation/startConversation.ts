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
  Provider,
  Tier,
} from '../../../types/index.js';
import { isoNow } from '../../../utils/isoNow.js';

export interface StartConversationInput {
  provider: Provider;
  prompt: string;
  tier?: Tier;
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
        message: `Provider '${input.provider}' is disabled in cennad config. Enable it via /cennad:setup before dispatching, or route to the other provider.`,
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
  const tier: Tier = input.tier ?? config.default_tier[input.provider];
  const options = {};

  await incrementCounter(input.provider);

  const composedPrompt = composePrompt({
    prompt: input.prompt,
    preamble: config.preamble[input.provider],
    recencyLevel: config.recency_factor[input.provider],
  });

  const base = {
    prompt: composedPrompt,
    tier,
    options,
    sessionId,
    cwd,
    spawnTimeoutMs: config.spawn_timeout_ms,
  };
  let result: DispatchResult;
  if (input.provider === 'codex') {
    result = await dispatchers.codex.start({
      ...base,
      flags: config.option_flags.codex,
    });
  } else if (input.provider === 'antigravity') {
    result = await dispatchers.antigravity.start({
      ...base,
      flags: config.option_flags.antigravity,
      modelMap: config.model_map.antigravity,
    });
  } else if (input.provider === 'claude') {
    result = await dispatchers.claude.start({
      ...base,
      flags: config.option_flags.claude,
      modelMap: config.model_map.claude,
    });
  } else {
    return {
      status: 'failure',
      session_id: sessionId,
      provider: input.provider,
      response: null,
      error: {
        code: 'unknown',
        message: `Provider '${input.provider}' is not supported by this cennad version.`,
      },
      meta: {
        turn: 0,
        created_at: isoNow(),
        elapsed_ms: Math.round(performance.now() - startedAt),
        ignored_options: [],
      },
    };
  }

  await createSession({
    sessionId,
    provider: input.provider,
    cwd,
    externalSessionRef: result.externalSessionRef,
    model: result.resolvedModel ?? tier,
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
      model: result.resolvedModel ?? tier,
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
