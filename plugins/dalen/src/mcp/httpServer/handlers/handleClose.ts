import type { ServerResponse } from "node:http";

import { closeSession } from "../../../core/sessionStore/closeSession.js";
import { closeResolver } from "../../../core/sessionStore/feedbackResolver.js";
import { getSession } from "../../../core/sessionStore/getSession.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;

/** POST /api/close — close a single session (viewer-initiated). */
export async function handleClose(
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
  closeResolver(sessionId);
  await closeSession(sessionId);
  sendJson(res, 200, { ok: true, status: "closed" });
}
