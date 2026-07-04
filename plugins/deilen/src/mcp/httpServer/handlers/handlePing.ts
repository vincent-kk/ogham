import type { ServerResponse } from "node:http";

import { getSession } from "../../../core/sessionStore/index.js";
import { SessionStatus } from "../../../types/enums.js";
import { SESSION_ID_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

/**
 * POST /api/ping — viewer heartbeat. The idle-timer reset already happened in
 * the dispatcher; here we confirm the page's session is still registered AND
 * serving. A closed (or unknown) session returns 404 so a cached page — which
 * still renders from browser cache — keeps its submit button disabled.
 */
export async function handlePing(
  context: RouteContext,
  sessionId: string,
  response: ServerResponse,
): Promise<void> {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    sendJson(response, 400, { ok: false, message: "Invalid session id" });
    return;
  }
  const meta = await getSession(sessionId, context.projectHash);
  if (!meta || meta.status === SessionStatus.Closed) {
    sendJson(response, 404, { ok: false, message: "Session unavailable" });
    return;
  }
  sendJson(response, 200, { ok: true });
}
