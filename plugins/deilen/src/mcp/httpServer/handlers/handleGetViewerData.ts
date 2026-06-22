import type { ServerResponse } from "node:http";

import { getSession } from "../../../core/sessionStore/getSession.js";
import { readViewerMarkdown } from "../../../core/sessionStore/readViewerMarkdown.js";
import { renderMarkdown } from "../../../render/operations/renderMarkdown.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;

/** GET /api/viewer — re-fetch render HTML+meta, or raw markdown (`format=md`). */
export async function handleGetViewerData(
  ctx: RouteContext,
  url: URL,
  res: ServerResponse,
): Promise<void> {
  const sessionId = url.searchParams.get("session") ?? "";
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
  if (url.searchParams.get("format") === "md") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": Buffer.byteLength(markdown),
    });
    res.end(markdown);
    return;
  }
  const render = renderMarkdown(markdown);
  sendJson(res, 200, {
    ok: true,
    title: meta.title,
    html: render.html,
    raw: markdown,
    line_count: render.lineCount,
    source_line_index: render.sourceLineIndex,
  });
}
