import type { ServerResponse } from "node:http";

import { getSession } from "../../../core/sessionStore/index.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;

/**
 * POST /api/ping — viewer heartbeat. The idle-timer reset already happened in
 * the dispatcher; here we confirm the page's session is still registered so the
 * viewer can gate submit on a live session, not merely a live server.
 */
export async function handlePing(
  ctx: RouteContext,
  sessionId: string,
  res: ServerResponse,
): Promise<void> {
  if (!SESSION_ID.test(sessionId)) {
    sendJson(res, 400, { ok: false, message: "Invalid session id" });
    return;
  }
  const meta = await getSession(sessionId, ctx.projectHash);
  if (!meta) {
    sendJson(res, 404, { ok: false, message: "Unknown session" });
    return;
  }
  sendJson(res, 200, { ok: true });
}
