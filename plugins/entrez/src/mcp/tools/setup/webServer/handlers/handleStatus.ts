import type { ServerResponse } from "node:http";

import type { RouteContext } from "../routeContext.js";
import { buildStatus } from "../utils/buildStatus.js";
import { sendJson } from "../utils/sendJson.js";

/** GET /status — current settings (api_key masked) + effective rate. */
export async function handleStatus(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const [config, credentials] = await Promise.all([
    ctx.loadConfig(),
    ctx.loadCredentials(),
  ]);
  sendJson(res, 200, buildStatus(config, credentials));
}
