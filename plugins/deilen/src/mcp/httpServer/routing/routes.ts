import type { IncomingMessage, ServerResponse } from "node:http";

import { sendJson } from "../utils/sendJson.js";

import { dispatchApiRoute } from "./apiRoutes.js";
import { tryAssetRoute } from "./assetRoute.js";
import { guardRequest } from "./guardRequest.js";
import type { RouteContext } from "./routeContext.js";

/** Build the request dispatcher: idle touch, token + CSRF guards, routing. */
export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    ctx.touch();
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "127.0.0.1"}`,
    );
    const path = url.pathname;
    const method = req.method ?? "GET";

    const onError = (err: unknown): void => {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      if (!res.headersSent) sendJson(res, 500, { ok: false, message });
      else res.destroy();
    };

    if (tryAssetRoute(ctx, path, method, res)) return;
    if (guardRequest(ctx, url, method, req, res)) return;
    dispatchApiRoute({ ctx, url, req, res, onError });
  };
}
