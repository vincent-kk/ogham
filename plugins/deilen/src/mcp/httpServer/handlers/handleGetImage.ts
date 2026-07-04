import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

import { DISPLAY_IMAGE_MIME_BY_EXT } from "../../../constants/defaults.js";
import {
  getSession,
  readViewerMarkdown,
} from "../../../core/sessionStore/index.js";
import { SESSION_ID_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";
import { getSessionImageSources } from "../utils/sessionImageSources.js";

const MB = 1024 * 1024;

const notFound = (response: ServerResponse): void =>
  sendJson(response, 404, { ok: false, message: "Image not found" });

/**
 * GET /api/image/<sid>/<index> — stream the index-th `file://` image referenced
 * by the session's viewer.md. Membership in that document is the allowlist (no
 * arbitrary path is servable); the resolved file must have a displayable
 * extension, be a regular file, and stay under max_image_mb.
 */
export async function handleGetImage(
  context: RouteContext,
  sessionId: string,
  index: number,
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
    notFound(response);
    return;
  }

  const sources = getSessionImageSources(sessionId, markdown);
  const fileUrl = sources[index];
  if (fileUrl === undefined) {
    notFound(response);
    return;
  }
  let target: string;
  try {
    target = fileURLToPath(fileUrl);
  } catch {
    notFound(response);
    return;
  }

  const mimeType: string | undefined =
    DISPLAY_IMAGE_MIME_BY_EXT[
      extname(target).toLowerCase() as keyof typeof DISPLAY_IMAGE_MIME_BY_EXT
    ];
  if (!mimeType) {
    notFound(response);
    return;
  }

  const config = await context.loadConfig();
  let realPath: string;
  try {
    realPath = await realpath(target);
    const info = await stat(realPath);
    if (!info.isFile()) {
      notFound(response);
      return;
    }
    if (info.size > config.max_image_mb * MB) {
      sendJson(response, 413, { ok: false, message: "Image too large" });
      return;
    }
  } catch {
    notFound(response);
    return;
  }

  const stream = createReadStream(realPath);
  stream.on("error", () => {
    if (!response.headersSent) notFound(response);
    else response.destroy();
  });
  response.writeHead(200, {
    "Content-Type": mimeType,
    "Cache-Control": "private, max-age=3600",
  });
  response.on("close", () => stream.destroy());
  stream.pipe(response);
}
