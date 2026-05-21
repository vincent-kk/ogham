import type { ServerResponse } from 'node:http';

import type { RouteContext } from '../routeContext.js';
import { sendJson } from '../utils/sendJson.js';

export async function handleGetConfig(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const config = await ctx.loadConfig();
  sendJson(res, 200, config);
}
