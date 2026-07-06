import type { IncomingMessage, ServerResponse } from "node:http";

import { inspectRequest } from "@ogham/http-guard/guard";

import type { RouteContext } from "./routeContext.js";
import { sendJson } from "./utils/sendJson.js";
import { handleGetRoot } from "./handlers/handleGetRoot.js";
import { handleStatus } from "./handlers/handleStatus.js";
import { handleTest } from "./handlers/handleTest.js";
import { handleSubmit } from "./handlers/handleSubmit.js";

export type { RouteContext } from "./routeContext.js";

/** Create an HTTP request handler with the given route context. The shared
 *  @ogham/http-guard canon (loopback host → token → POST origin →
 *  application/json) guards every request before method/path dispatch. The
 *  loopback host + POST origin checks block DNS-rebinding; the token gates
 *  every request. Server binds to 127.0.0.1 only; no CORS headers. */
export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse) => {
    ctx.resetTimer();

    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "127.0.0.1"}`,
    );
    const path = url.pathname;

    const verdict = inspectRequest({
      host: req.headers.host,
      method: req.method ?? "GET",
      origin: req.headers.origin,
      contentType: req.headers["content-type"],
      expectedToken: ctx.token,
      providedToken: url.searchParams.get("token") ?? "",
    });
    if (!verdict.ok) {
      sendJson(res, verdict.status, {
        success: false,
        message: verdict.message,
      });
      return;
    }

    const handleError = (err: unknown): void => {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      sendJson(res, 500, { success: false, message });
    };

    if (path === "/" && req.method === "GET")
      handleGetRoot(ctx, res).catch(handleError);
    else if (path === "/status" && req.method === "GET")
      handleStatus(ctx, res).catch(handleError);
    else if (path === "/test" && req.method === "POST")
      handleTest(ctx, req, res).catch(handleError);
    else if (path === "/submit" && req.method === "POST")
      handleSubmit(ctx, req, res).catch(handleError);
    else sendJson(res, 404, { success: false, message: "Not found" });
  };
}
