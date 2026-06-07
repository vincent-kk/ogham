import type { IncomingMessage, ServerResponse } from 'node:http';

import { ConfigSchema } from '../../../../../types/index.js';
import type { RouteContext } from '../routing/routeContext.js';
import { parseBody } from '../utils/parseBody.js';
import { sendJson } from '../utils/sendJson.js';

export async function handleSave(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      message: `Invalid JSON body: ${(err as Error).message}`,
    });
    return;
  }

  const parsed = ConfigSchema.safeParse(raw);
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

  try {
    await ctx.saveConfig(parsed.data);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      message: `Failed to save config: ${(err as Error).message}`,
    });
    return;
  }

  // Sync agy's MCP registry to the saved toggle. provisionYoutube never throws —
  // an agy-config problem must not fail a successful config save.
  const youtube = await ctx.provisionYoutube(
    parsed.data.antigravity_youtube.enabled,
  );

  sendJson(res, 200, {
    success: true,
    message: 'Saved',
    antigravity_youtube: { ok: youtube.ok, action: youtube.action },
  });
}
