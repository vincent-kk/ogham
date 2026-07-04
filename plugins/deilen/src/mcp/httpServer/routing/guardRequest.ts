import type { IncomingMessage, ServerResponse } from "node:http";

import { verifyToken } from "../../../core/authToken/index.js";
import { sendJson } from "../utils/sendJson.js";

import type { RouteContext } from "./routeContext.js";

const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost)(:\d+)?$/i;
const LOOPBACK_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;

/**
 * Host + token + CSRF guards applied after the asset branch. The loopback Host
 * check and the POST Origin check block DNS-rebinding even if the token leaks.
 * Returns true when the request was rejected (response already sent), false to
 * continue routing.
 */
export function guardRequest(
  context: RouteContext,
  url: URL,
  method: string,
  request: IncomingMessage,
  response: ServerResponse,
): boolean {
  if (!LOOPBACK_HOST.test(request.headers.host ?? "")) {
    sendJson(response, 403, { ok: false, message: "Invalid host" });
    return true;
  }

  if (!verifyToken(context.token, url.searchParams.get("token") ?? "")) {
    sendJson(response, 401, { ok: false, message: "Invalid token" });
    return true;
  }

  if (method === "POST") {
    const origin = request.headers.origin;
    if (origin !== undefined && !LOOPBACK_ORIGIN.test(origin)) {
      sendJson(response, 403, { ok: false, message: "Invalid origin" });
      return true;
    }
    const ct = (request.headers["content-type"] ?? "").toLowerCase();
    if (
      !ct.startsWith("application/json") &&
      !ct.startsWith("multipart/form-data")
    ) {
      sendJson(response, 415, {
        ok: false,
        message: "Unsupported Content-Type",
      });
      return true;
    }
  }
  return false;
}
