import type { IncomingMessage, ServerResponse } from "node:http";

import { sendJson } from "../utils/sendJson.js";

import { dispatchApiRoute } from "./apiRoutes.js";
import { tryAssetRoute } from "./assetRoute.js";
import { guardRequest } from "./guardRequest.js";
import type { RouteContext } from "./routeContext.js";

/** Build the request dispatcher: idle touch, token + CSRF guards, routing. */
export function createRouteHandler(
  context: RouteContext,
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    context.touch();
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "127.0.0.1"}`,
    );
    const path = url.pathname;
    const method = request.method ?? "GET";

    const onError = (error: unknown): void => {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      if (!response.headersSent)
        sendJson(response, 500, { ok: false, message });
      else response.destroy();
    };

    if (tryAssetRoute(context, path, method, response)) return;
    if (guardRequest(context, url, method, request, response)) return;
    dispatchApiRoute({ context, url, request, response, onError });
  };
}
