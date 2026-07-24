import type { ServerResponse } from "node:http";

import { sendJson } from "@ogham/http-kit/response";

import type { RouteContext } from "../routing/routeContext.js";

/** GET /api/config — return the current Config as JSON. */
export async function handleGetConfig(
  context: RouteContext,
  response: ServerResponse,
): Promise<void> {
  sendJson(response, 200, { ok: true, config: await context.loadConfig() });
}
