import type { ServerResponse } from "node:http";

import {
  getSession,
  readViewerMarkdown,
} from "../../../core/sessionStore/index.js";
import { HEARTBEAT_INTERVAL_MS } from "../../../constants/defaults.js";
import { renderMarkdown } from "../../../render/operations/renderMarkdown.js";
import type { RouteContext } from "../routing/routeContext.js";
import { escapeJsonForHtml } from "../utils/escapeJsonForHtml.js";
import { sendJson } from "../utils/sendJson.js";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;

/** GET /r/<session> — serve the viewer HTML with injected `__DEILEN_STATE__`. */
export async function handleGetViewer(
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
  const markdown = await readViewerMarkdown(sessionId);
  if (markdown === null) {
    sendJson(res, 404, { ok: false, message: "Viewer content missing" });
    return;
  }
  const config = await ctx.loadConfig();
  const render = renderMarkdown(markdown);
  const overrides = meta.options;
  const state = {
    session_id: sessionId,
    token: ctx.token,
    title: meta.title,
    html: render.html,
    raw: markdown,
    line_count: render.lineCount,
    source_line_index: render.sourceLineIndex,
    theme: overrides?.theme ?? config.theme,
    content_width_px: overrides?.content_width_px ?? config.content_width_px,
    font_family: config.font_family,
    renderers: {
      mermaid: overrides?.renderers?.mermaid ?? config.renderers.mermaid,
      highlight: overrides?.renderers?.highlight ?? config.renderers.highlight,
      math: overrides?.renderers?.math ?? config.renderers.math,
    },
    heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS,
  };
  const html = ctx
    .loadViewerHtml()
    .replace(/["']__DEILEN_STATE__["']/, () => escapeJsonForHtml(state));
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}
