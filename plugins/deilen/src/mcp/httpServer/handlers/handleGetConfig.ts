import type { ServerResponse } from "node:http";

import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

/** GET /api/config — return the current Config as JSON. */
export async function handleGetConfig(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  sendJson(res, 200, { ok: true, config: await ctx.loadConfig() });
}
