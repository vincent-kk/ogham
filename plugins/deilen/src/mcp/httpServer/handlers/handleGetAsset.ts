import { createReadStream } from "node:fs";
import type { ServerResponse } from "node:http";
import { extname } from "node:path";

import type { RouteContext } from "../routing/routeContext.js";
import { sendJson } from "../utils/sendJson.js";

const ASSET_MIME: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

/** GET /assets/<name> — stream a built renderer chunk (token-exempt). */
export function handleGetAsset(
  ctx: RouteContext,
  name: string,
  res: ServerResponse,
): void {
  const full = ctx.resolveAssetPath(name);
  if (!full) {
    sendJson(res, 404, { ok: false, message: "Asset not found" });
    return;
  }
  const type = ASSET_MIME[extname(full).toLowerCase()];
  if (!type) {
    sendJson(res, 404, { ok: false, message: "Asset not found" });
    return;
  }
  const stream = createReadStream(full);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendJson(res, 404, { ok: false, message: "Asset not found" });
    } else {
      res.destroy();
    }
  });
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "public, max-age=3600",
  });
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}
