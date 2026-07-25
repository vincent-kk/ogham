import type { IncomingMessage, ServerResponse } from 'node:http';

import { describeBodyError, parseBody } from '@ogham/http-kit/body';
import { sendJson } from '@ogham/http-kit/response';

import { ConfigSchema } from '../../../../../types/index.js';
import type { RouteContext } from '../routing/routeContext.js';

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
  // needless user MCP CLI spawns when the effective state is unchanged.
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
    youtube: {
      claude: youtube.claude,
      codex: youtube.codex,
      antigravity: youtube.antigravity,
    },
  });
}
