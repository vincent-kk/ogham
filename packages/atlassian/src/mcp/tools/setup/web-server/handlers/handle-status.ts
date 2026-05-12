import type { ServerResponse } from 'node:http';
import type { RouteContext } from '../route-context.js';
import { sendJson } from '../utils/send-json.js';
import { buildStatus } from '../utils/build-status.js';

export async function handleStatus(ctx: RouteContext, res: ServerResponse): Promise<void> {
  const config = await ctx.loadConfig();
  sendJson(res, 200, buildStatus(config));
}
