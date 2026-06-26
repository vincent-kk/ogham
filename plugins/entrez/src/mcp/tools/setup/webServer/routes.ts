import type { IncomingMessage, ServerResponse } from "node:http";

import type { RouteContext } from "./routeContext.js";
import { sendJson } from "./utils/sendJson.js";
import { handleGetRoot } from "./handlers/handleGetRoot.js";
import { handleStatus } from "./handlers/handleStatus.js";
import { handleTest } from "./handlers/handleTest.js";
import { handleSubmit } from "./handlers/handleSubmit.js";

export type { RouteContext } from "./routeContext.js";

const JSON_CONTENT_TYPE = "application/json";

/**
 * HTTP request handler: CSRF guard (POST must be application/json — blocks
 * cross-origin "simple" text/plain POSTs) + method/path dispatch. Server binds
 * to 127.0.0.1 only; no CORS headers (same-origin).
 */
export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    ctx.resetTimer();
    const path = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
      .pathname;

    if (
      req.method === "POST" &&
      !(req.headers["content-type"] ?? "").toLowerCase().startsWith(JSON_CONTENT_TYPE)
    ) {
      sendJson(res, 415, { success: false, message: "Content-Type must be application/json" });
      return;
    }

    const onError = (err: unknown): void => {
      sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      });
    };

    if (path === "/" && req.method === "GET") handleGetRoot(ctx, res).catch(onError);
    else if (path === "/status" && req.method === "GET") handleStatus(ctx, res).catch(onError);
    else if (path === "/test" && req.method === "POST") handleTest(ctx, req, res).catch(onError);
    else if (path === "/submit" && req.method === "POST") handleSubmit(ctx, req, res).catch(onError);
    else sendJson(res, 404, { success: false, message: "Not found" });
  };
}
