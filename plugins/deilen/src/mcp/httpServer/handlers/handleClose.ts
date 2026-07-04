import type { ServerResponse } from "node:http";

import {
  closeResolver,
  closeSession,
  getSession,
} from "../../../core/sessionStore/index.js";
import { SessionStatus } from "../../../types/enums.js";
import { SESSION_ID_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

/** POST /api/close — close a single session (viewer-initiated). */
export async function handleClose(
  context: RouteContext,
  sessionId: string,
  response: ServerResponse,
): Promise<void> {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    sendJson(response, 400, { ok: false, message: "Invalid session id" });
    return;
  }
  const meta = await getSession(sessionId, context.projectHash);
  if (!meta) {
    sendJson(response, 404, { ok: false, message: "Unknown session" });
    return;
  }
  closeResolver(sessionId);
  await closeSession(sessionId);
  sendJson(response, 200, { ok: true, status: SessionStatus.Closed });
}
