import type { ServerResponse } from "node:http";

import {
  getSession,
  readViewerMarkdown,
} from "../../../core/sessionStore/index.js";
import { renderMarkdown } from "../../../render/index.js";
import { SESSION_ID_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

/** GET /api/viewer — re-fetch render HTML+meta, or raw markdown (`format=md`). */
export async function handleGetViewerData(
  context: RouteContext,
  url: URL,
  response: ServerResponse,
): Promise<void> {
  const sessionId = url.searchParams.get("session") ?? "";
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
  if (url.searchParams.get("format") === "md") {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": Buffer.byteLength(markdown),
    });
    response.end(markdown);
    return;
  }
  const render = renderMarkdown(markdown, {
    imageRewrite: { sessionId, token: context.token },
  });
  sendJson(response, 200, {
    ok: true,
    title: meta.title,
    html: render.html,
    raw: markdown,
    line_count: render.lineCount,
    source_line_index: render.sourceLineIndex,
  });
}
