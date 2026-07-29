import type { ServerResponse } from "node:http";

import { sendJson } from "@ogham/http-kit/response";

import type { RouteContext } from "../routing/routeContext.js";

/**
 * GET /api/config — return both config layers, the merge, and what the project
 * layer overrode. The page needs all four to draw the scope toggle and badges.
 */
export function handleGetConfig(
  context: RouteContext,
  response: ServerResponse,
): void {
  sendJson(response, 200, { ok: true, state: context.loadConfigState() });
}
