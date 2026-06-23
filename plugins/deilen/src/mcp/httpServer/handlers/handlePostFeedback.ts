import type { IncomingMessage, ServerResponse } from "node:http";

import { saveFeedback } from "../../../core/feedbackStore/index.js";
import {
  closeSession,
  deliverComplete,
  getSession,
} from "../../../core/sessionStore/index.js";
import {
  FeedbackPayloadSchema,
  type ImageRef,
} from "../../../types/feedback.js";
import type { RouteContext } from "../routing/routeContext.js";
import { parseJsonBody } from "../utils/parseJsonBody.js";
import { parseMultipart } from "../utils/parseMultipart.js";
import { sendJson } from "../utils/sendJson.js";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;
const MB = 1024 * 1024;

// Sessions whose complete submit is mid-close. Added synchronously before any
// await so two concurrent complete POSTs can't both pass the closed-check.
const closingSessions = new Set<string>();

/**
 * POST /api/feedback — persist a submission. JSON bodies are text-only
 * auto-saves (in_progress); multipart bodies carry image parts and a complete
 * submission that wakes a waiting collect_feedback.
 */
export async function handlePostFeedback(
  ctx: RouteContext,
  sessionId: string,
  req: IncomingMessage,
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
  if (meta.status === "closed") {
    sendJson(res, 409, { ok: false, message: "Session closed" });
    return;
  }

  const config = await ctx.loadConfig();
  const contentType = (req.headers["content-type"] ?? "").toLowerCase();

  let rawPayload: unknown;
  let images: ImageRef[] = [];
  try {
    if (contentType.startsWith("multipart/form-data")) {
      const parsed = await parseMultipart(req, {
        sessionId,
        maxImageBytes: config.max_image_mb * MB,
        maxPayloadBytes: config.max_payload_mb * MB,
      });
      rawPayload = parsed.payload;
      images = parsed.images;
    } else {
      rawPayload = await parseJsonBody(req, config.max_payload_mb * MB);
    }
  } catch (err) {
    sendJson(res, 400, { ok: false, message: (err as Error).message });
    return;
  }

  const parsed = FeedbackPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    sendJson(res, 400, { ok: false, message: "Invalid feedback payload" });
    return;
  }
  const payload = parsed.data;
  if (payload.session_id !== sessionId) {
    sendJson(res, 400, { ok: false, message: "session_id mismatch" });
    return;
  }

  if (payload.status === "complete") {
    if (closingSessions.has(sessionId)) {
      sendJson(res, 409, { ok: false, message: "Session closing" });
      return;
    }
    closingSessions.add(sessionId);
  }
  try {
    const stored = await saveFeedback(
      sessionId,
      payload,
      payload.status === "complete" ? images : [],
    );
    if (payload.status === "complete") {
      // Close before waking the waiter: this closeSession meta write must not
      // race the collect-side session purge (removeSession) on the same dir.
      await closeSession(sessionId);
      deliverComplete(sessionId, stored);
    }
    sendJson(res, 200, { ok: true, status: payload.status });
  } finally {
    if (payload.status === "complete") closingSessions.delete(sessionId);
  }
}
