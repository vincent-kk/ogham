import type { IncomingMessage, ServerResponse } from "node:http";

import { saveFeedback } from "../../../core/feedbackStore/index.js";
import {
  closeSession,
  deliverComplete,
  getSession,
} from "../../../core/sessionStore/index.js";
import {
  FeedbackIntent,
  FeedbackStatus,
  SessionStatus,
} from "../../../types/enums.js";
import {
  FeedbackPayloadSchema,
  type ImageRef,
} from "../../../types/feedback.js";
import { SESSION_ID_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";
import { parseJsonBody } from "../utils/parseJsonBody.js";
import { parseMultipart } from "../utils/parseMultipart.js";
import { sendJson } from "../utils/sendJson.js";

const MB = 1024 * 1024;

// Sessions whose complete submit is mid-close. Added synchronously before any
// await so two concurrent complete POSTs can't both pass the closed-check.
const closingSessions = new Set<string>();

// Persist the chosen submit intent so the next viewer defaults to it. Best-effort
// — a config write must never fail the feedback submission itself.
async function persistLastIntent(
  context: RouteContext,
  intent: typeof FeedbackIntent.Revise | typeof FeedbackIntent.Discuss,
): Promise<void> {
  try {
    const config = await context.loadConfig();
    if (config.last_intent !== intent)
      await context.saveConfig({ ...config, last_intent: intent });
  } catch {
    /* swallow: last_intent is a convenience default, not part of the contract */
  }
}

/**
 * POST /api/feedback — persist a submission. JSON bodies are text-only
 * auto-saves (in_progress); multipart bodies carry image parts and a complete
 * submission that wakes a waiting collect_feedback.
 */
export async function handlePostFeedback(
  context: RouteContext,
  sessionId: string,
  request: IncomingMessage,
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
  if (meta.status === SessionStatus.Closed) {
    sendJson(response, 409, { ok: false, message: "Session closed" });
    return;
  }

  const config = await context.loadConfig();
  const contentType = (request.headers["content-type"] ?? "").toLowerCase();

  let rawPayload: unknown;
  let images: ImageRef[] = [];
  try {
    if (contentType.startsWith("multipart/form-data")) {
      const parsed = await parseMultipart(request, {
        sessionId,
        maxImageBytes: config.max_image_mb * MB,
        maxPayloadBytes: config.max_payload_mb * MB,
      });
      rawPayload = parsed.payload;
      images = parsed.images;
    } else
      rawPayload = await parseJsonBody(request, config.max_payload_mb * MB);
  } catch (error) {
    sendJson(response, 400, { ok: false, message: (error as Error).message });
    return;
  }

  const parsed = FeedbackPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    sendJson(response, 400, { ok: false, message: "Invalid feedback payload" });
    return;
  }
  const payload = parsed.data;
  if (payload.session_id !== sessionId) {
    sendJson(response, 400, { ok: false, message: "session_id mismatch" });
    return;
  }

  if (payload.status === FeedbackStatus.Complete) {
    if (closingSessions.has(sessionId)) {
      sendJson(response, 409, { ok: false, message: "Session closing" });
      return;
    }
    closingSessions.add(sessionId);
  }
  try {
    const stored = await saveFeedback(
      sessionId,
      payload,
      payload.status === FeedbackStatus.Complete ? images : [],
    );
    if (payload.status === FeedbackStatus.Complete) {
      // Close before waking the waiter so a refreshed viewer renders as ended
      // even if collect-side feedback cleanup runs immediately afterward.
      await closeSession(sessionId);
      deliverComplete(sessionId, stored);
      if (
        payload.intent === FeedbackIntent.Revise ||
        payload.intent === FeedbackIntent.Discuss
      )
        await persistLastIntent(context, payload.intent);
    }
    sendJson(response, 200, { ok: true, status: payload.status });
  } finally {
    if (payload.status === FeedbackStatus.Complete)
      closingSessions.delete(sessionId);
  }
}
