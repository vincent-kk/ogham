import type { ServerResponse } from "node:http";

import {
  getSession,
  readViewerMarkdown,
} from "../../../core/sessionStore/index.js";
import { HEARTBEAT_INTERVAL_MS } from "../../../constants/defaults.js";
import { renderMarkdown } from "../../../render/index.js";
import {
  DEILEN_STATE_PLACEHOLDER_PATTERN,
  SESSION_ID_PATTERN,
} from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";
import { escapeJsonForHtml } from "../utils/escapeJsonForHtml.js";
import { sendJson } from "../utils/sendJson.js";

/** GET /r/<session> — serve the viewer HTML with injected `__DEILEN_STATE__`. */
export async function handleGetViewer(
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
  const markdown = await readViewerMarkdown(sessionId);
  if (markdown === null) {
    sendJson(response, 404, { ok: false, message: "Viewer content missing" });
    return;
  }
  const config = await context.loadConfig();
  const render = renderMarkdown(markdown);
  const overrides = meta.options;
  const state = {
    session_id: sessionId,
    token: context.token,
    title: meta.title,
    html: render.html,
    raw: markdown,
    line_count: render.lineCount,
    source_line_index: render.sourceLineIndex,
    theme: overrides?.theme ?? config.theme,
    content_width_px: overrides?.content_width_px ?? config.content_width_px,
    font_family: config.font_family,
    last_intent: config.last_intent,
    renderers: {
      mermaid: overrides?.renderers?.mermaid ?? config.renderers.mermaid,
      highlight: overrides?.renderers?.highlight ?? config.renderers.highlight,
      math: overrides?.renderers?.math ?? config.renderers.math,
    },
    heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS,
  };
  const html = context
    .loadViewerHtml()
    .replace(DEILEN_STATE_PLACEHOLDER_PATTERN, () => escapeJsonForHtml(state));
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  response.end(html);
}
