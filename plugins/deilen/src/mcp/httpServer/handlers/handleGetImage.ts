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
import { walkLocalImages } from "../../../render/index.js";
import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;
const MB = 1024 * 1024;

const notFound = (res: ServerResponse): void =>
  sendJson(res, 404, { ok: false, message: "Image not found" });

/**
 * GET /api/image/<sid>/<index> — stream the index-th `file://` image referenced
 * by the session's viewer.md. Membership in that document is the allowlist (no
 * arbitrary path is servable); the resolved file must have a displayable
 * extension, be a regular file, and stay under max_image_mb.
 */
export async function handleGetImage(
  ctx: RouteContext,
  sessionId: string,
  index: number,
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
    notFound(res);
    return;
  }

  const sources: string[] = [];
  walkLocalImages(markdown, (src) => sources.push(src));
  const fileUrl = sources[index];
  if (fileUrl === undefined) {
    notFound(res);
    return;
  }
  let target: string;
  try {
    target = fileURLToPath(fileUrl);
  } catch {
    notFound(res);
    return;
  }

  const mime = DISPLAY_IMAGE_MIME_BY_EXT[extname(target).toLowerCase()];
  if (!mime) {
    notFound(res);
    return;
  }

  const config = await ctx.loadConfig();
  let real: string;
  try {
    real = await realpath(target);
    const info = await stat(real);
    if (!info.isFile()) {
      notFound(res);
      return;
    }
    if (info.size > config.max_image_mb * MB) {
      sendJson(res, 413, { ok: false, message: "Image too large" });
      return;
    }
  } catch {
    notFound(res);
    return;
  }

  const stream = createReadStream(real);
  stream.on("error", () => {
    if (!res.headersSent) notFound(res);
    else res.destroy();
  });
  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "private, max-age=3600",
  });
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}
