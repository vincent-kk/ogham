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

  // Read the prior config before overwriting it; provisionYoutube uses it to skip
  // needless `codex mcp` spawns when the effective codex state is unchanged.
  const previous = await ctx.loadConfig();

  try {
    await ctx.saveConfig(parsed.data);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      message: `Failed to save config: ${(err as Error).message}`,
    });
    return;
  }

  // Reconcile the YouTube MCP addon across its target CLIs. provisionYoutube never
  // throws — an addon-provisioning problem must not fail a successful config save.
  const youtube = await ctx.provisionYoutube(
    parsed.data.addons.youtube,
    previous.addons.youtube,
  );

  sendJson(res, 200, {
    success: true,
    message: 'Saved',
    youtube: { antigravity: youtube.antigravity, codex: youtube.codex },
  });
}
