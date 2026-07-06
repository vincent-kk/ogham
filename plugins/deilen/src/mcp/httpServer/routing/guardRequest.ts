import type { IncomingMessage, ServerResponse } from "node:http";

import { inspectRequest } from "@ogham/http-guard/guard";

import { sendJson } from "../utils/sendJson.js";

import type { RouteContext } from "./routeContext.js";

/** deilen serves image uploads, so multipart joins JSON as an accepted POST body. */
const ALLOWED_CONTENT_TYPES = [
  "application/json",
  "multipart/form-data",
] as const;

/**
 * Host + token + CSRF guards applied after the asset branch. The loopback Host
 * check and the POST Origin check block DNS-rebinding even if the token leaks.
 * Delegates the decision to the shared @ogham/http-guard canon and maps a
 * rejecting verdict onto deilen's { ok, message } envelope. Returns true when
 * the request was rejected (response already sent), false to continue routing.
 */
export function guardRequest(
  context: RouteContext,
  url: URL,
  method: string,
  request: IncomingMessage,
  response: ServerResponse,
): boolean {
  const verdict = inspectRequest({
    host: request.headers.host,
    method,
    origin: request.headers.origin,
    contentType: request.headers["content-type"],
    expectedToken: context.token,
    providedToken: url.searchParams.get("token") ?? "",
    allowedContentTypes: ALLOWED_CONTENT_TYPES,
  });
  if (!verdict.ok) {
    sendJson(response, verdict.status, { ok: false, message: verdict.message });
    return true;
  }
  return false;
}
