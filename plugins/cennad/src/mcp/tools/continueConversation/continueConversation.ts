import { performance } from 'node:perf_hooks';

import { writeArtifact } from '../../../core/artifactWriter/index.js';
import { loadConfig } from '../../../core/configManager/index.js';
import { incrementCounter } from '../../../core/counterManager/index.js';
import { getProjectHash } from '../../../core/projectHash/index.js';
import { getSession, updateSession } from '../../../core/sessionStore/index.js';
import {
  buildResponse,
  composePrompt,
  dispatchers,
} from '../../../dispatcher/index.js';
import type {
  ConversationResponse,
  DispatchResult,
  Tier,
} from '../../../types/index.js';
import { isoNow } from '../../../utils/isoNow.js';

export interface ContinueConversationInput {
  session_id: string;
  prompt: string;
  tier?: Tier;
}

export async function handleContinueConversation(
  input: ContinueConversationInput,
): Promise<ConversationResponse> {
  const startedAt = performance.now();
  const cwd = process.cwd();
  const projectHash = getProjectHash(cwd);

  const session = await getSession(projectHash, input.session_id);
  if (!session)
    return {
      status: 'failure',
      session_id: input.session_id,
      provider: null,
      response: null,
      error: {
        code: 'unknown',
        message:
          'Session not found in the current project. The original provider cannot be determined from the session_id alone. If you remember which provider it used, retry with /cennad:codex --continue <id>, /cennad:antigravity --continue <id>, or /cennad:claude --continue <id>; otherwise start a fresh session.',
      },
      meta: {
        turn: 0,
        created_at: isoNow(),
        elapsed_ms: Math.round(performance.now() - startedAt),
        ignored_options: [],
      },
    };

  const config = await loadConfig();
  if (!config.ratio[session.provider].enabled)
    return {
      status: 'failure',
      session_id: session.session_id,
      provider: session.provider,
      response: null,
      error: {
        code: 'disabled',
        message: `Provider '${session.provider}' is disabled in cennad config. Re-enable it via /cennad:setup to resume this session.`,
      },
      meta: {
        turn: session.turn_count,
        created_at: isoNow(),
        elapsed_ms: Math.round(performance.now() - startedAt),
        ignored_options: [],
      },
    };

  await incrementCounter(session.provider);

  const composedPrompt = composePrompt({
    prompt: input.prompt,
    preamble: config.preamble[session.provider],
    recencyLevel: config.recency_factor[session.provider],
  });
  // Prefer the session's own tier over default_tier: tiers now select a model, so
  // falling back to the default would switch models mid-thread (codex warns and can
  // lose continuity). An explicit tier still overrides.
  const tier: Tier =
    input.tier ?? session.tier ?? config.default_tier[session.provider];
  const base = {
    prompt: composedPrompt,
    tier,
    options: {},
    sessionId: session.session_id,
    cwd: session.cwd,
    externalSessionRef: session.external_session_ref,
    spawnTimeoutMs: config.spawn_timeout_ms,
  };
  let result: DispatchResult;
  if (session.provider === 'antigravity')
    result = await dispatchers.antigravity.resume({
      ...base,
      flags: config.option_flags.antigravity,
      modelMap: config.model_map.antigravity,
    });
  else if (session.provider === 'codex')
    result = await dispatchers.codex.resume({
      ...base,
      flags: config.option_flags.codex,
      modelMap: config.model_map.codex,
    });
  else if (session.provider === 'claude')
    result = await dispatchers.claude.resume({
      ...base,
      flags: config.option_flags.claude,
      modelMap: config.model_map.claude,
    });
  else
    return {
      status: 'failure',
      session_id: session.session_id,
      provider: null,
      response: null,
      error: {
        code: 'unknown',
        message: `Session references an unsupported provider '${session.provider}'. cennad can only resume 'antigravity', 'codex', or 'claude' sessions; this stored session is likely from an incompatible cennad version. Start a fresh session with /cennad:codex, /cennad:antigravity, or /cennad:claude.`,
      },
      meta: {
        turn: session.turn_count,
        created_at: isoNow(),
        elapsed_ms: Math.round(performance.now() - startedAt),
        ignored_options: [],
      },
    };

  const nextTurn = session.turn_count + 1;
  await updateSession({
    ...session,
    last_used_at: isoNow(),
    turn_count: nextTurn,
  });

  const createdAt = isoNow();
  let artifactPath: string | undefined;
  if (
    config.artifacts.enabled &&
    result.status === 'success' &&
    result.response !== null
  )
    artifactPath = await writeArtifact({
      artifacts: config.artifacts,
      cwd: session.cwd,
      projectHash,
      sessionId: session.session_id,
      turn: nextTurn,
      provider: session.provider,
      model: result.resolvedModel ?? session.model,
      createdAt,
      elapsedMs: Math.round(performance.now() - startedAt),
      prompt: input.prompt,
      composedPrompt,
      response: result.response,
    });

  return buildResponse({
    sessionId: session.session_id,
    provider: session.provider,
    result,
    turn: nextTurn,
    createdAt,
    startedAt,
    artifactPath,
  });
}
