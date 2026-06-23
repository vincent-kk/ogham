import type { IncomingMessage, ServerResponse } from "node:http";

import { verifyToken } from "../../../core/authToken/index.js";
import { sendJson } from "../utils/sendJson.js";

import type { RouteContext } from "./routeContext.js";

/**
 * Token + CSRF guards applied after the asset branch. Returns true when the
 * request was rejected (response already sent), false to continue routing.
 */
export function guardRequest(
  ctx: RouteContext,
  url: URL,
  method: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (!verifyToken(ctx.token, url.searchParams.get("token") ?? "")) {
    sendJson(res, 401, { ok: false, message: "Invalid token" });
    return true;
  }

  if (method === "POST") {
    const ct = (req.headers["content-type"] ?? "").toLowerCase();
    if (
      !ct.startsWith("application/json") &&
      !ct.startsWith("multipart/form-data")
    ) {
      sendJson(res, 415, { ok: false, message: "Unsupported Content-Type" });
      return true;
    }
  }
  return false;
}
