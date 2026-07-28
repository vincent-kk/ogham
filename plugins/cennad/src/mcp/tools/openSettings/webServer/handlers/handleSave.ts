import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ConfigScope } from '@ogham/cross-platform/config-scope';
import { mergeConfigLayers } from '@ogham/cross-platform/config-scope/merge';
import { describeBodyError, parseBody } from '@ogham/http-kit/body';
import { sendJson } from '@ogham/http-kit/response';

import { ConfigSchema } from '../../../../../types/index.js';
import type { RouteContext } from '../routing/routeContext.js';

interface SaveSubmission {
  scope: ConfigScope;
  config: Record<string, unknown>;
}

/**
 * POST /save — validate the submitted layer and persist it.
 *
 * The body names which layer it is. A user payload is a complete document; a
 * project payload carries only the overridden keys, and dropping a key from
 * it IS the clear-override action — which is why there is no separate route.
 *
 * Validation runs on the merged preview, never the submitted layer alone: a
 * partial project document cannot satisfy the strict schema by itself.
 * Nothing is written unless the preview parses.
 */
export async function handleSave(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch (err) {
    const { status, message } = describeBodyError(err);
    sendJson(res, status, { success: false, message });
    return;
  }

  const submitted = readSubmission(raw);
  if (submitted === null) {
    sendJson(res, 400, {
      success: false,
      message: 'Body must be { scope: "user" | "project", config: object }',
    });
    return;
  }

  const state = ctx.loadConfigState();
  if (submitted.scope === 'project' && state.paths.project === null) {
    sendJson(res, 400, {
      success: false,
      message: 'No project root is available, so there is no project layer.',
    });
    return;
  }

  const preview =
    submitted.scope === 'user'
      ? mergeConfigLayers(submitted.config, state.layers.project)
      : mergeConfigLayers(state.layers.user, submitted.config);

  const parsed = ConfigSchema.safeParse(preview);
  if (!parsed.success) {
    sendJson(res, 400, {
      success: false,
      message: 'Config validation failed',
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      ),
    });
    return;
  }

  // Read the prior config before overwriting it; provisionYoutube uses it to skip
  // needless user MCP CLI spawns when the effective state is unchanged.
  const previous = await ctx.loadConfig();

  let saved;
  try {
    saved = await ctx.saveConfig(submitted.scope, submitted.config);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      message: `Failed to save config: ${(err as Error).message}`,
    });
    return;
  }

  // Reconcile the YouTube MCP addon across its target CLIs. provisionYoutube never
  // throws — an addon-provisioning problem must not fail a successful config save.
  // The merged preview is what takes effect, so that is what gets reconciled.
  const youtube = await ctx.provisionYoutube(
    parsed.data.addons.youtube,
    previous.addons.youtube,
  );

  sendJson(res, 200, {
    success: true,
    message: 'Saved',
    state: saved,
    youtube: {
      claude: youtube.claude,
      codex: youtube.codex,
      antigravity: youtube.antigravity,
    },
  });
}

/** Narrow an untrusted body to a submission, or null when it is not one. */
function readSubmission(body: unknown): SaveSubmission | null {
  if (typeof body !== 'object' || body === null) return null;
  const { scope, config } = body as Record<string, unknown>;
  if (scope !== 'user' && scope !== 'project') return null;
  if (typeof config !== 'object' || config === null || Array.isArray(config))
    return null;
  return { scope, config: config as Record<string, unknown> };
}
