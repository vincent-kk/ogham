import type { IncomingMessage, ServerResponse } from "node:http";

import { handleClose } from "../handlers/handleClose.js";
import { handleGetConfig } from "../handlers/handleGetConfig.js";
import { handleGetSettings } from "../handlers/handleGetSettings.js";
import { handleGetViewer } from "../handlers/handleGetViewer.js";
import { handleGetViewerData } from "../handlers/handleGetViewerData.js";
import { handlePing } from "../handlers/handlePing.js";
import { handlePostFeedback } from "../handlers/handlePostFeedback.js";
import { handleSaveConfig } from "../handlers/handleSaveConfig.js";
import { sendJson } from "../utils/sendJson.js";

import type { RouteContext } from "./routeContext.js";

const VIEWER_PATH = /^\/r\/([^/]+)$/;

interface RouteArgs {
  ctx: RouteContext;
  url: URL;
  req: IncomingMessage;
  res: ServerResponse;
  onError: (err: unknown) => void;
}

type RouteHandler = (args: RouteArgs) => void;

const sessionOf = (url: URL): string => url.searchParams.get("session") ?? "";

const STATIC_ROUTES: Record<string, RouteHandler> = {
  "GET /api/viewer": ({ ctx, url, res, onError }) =>
    void handleGetViewerData(ctx, url, res).catch(onError),
  "GET /settings": ({ ctx, res, onError }) =>
    void handleGetSettings(ctx, res).catch(onError),
  "GET /api/config": ({ ctx, res, onError }) =>
    void handleGetConfig(ctx, res).catch(onError),
  "POST /api/config": ({ ctx, req, res, onError }) =>
    void handleSaveConfig(ctx, req, res).catch(onError),
  "POST /api/feedback": ({ ctx, url, req, res, onError }) =>
    void handlePostFeedback(ctx, sessionOf(url), req, res).catch(onError),
  "POST /api/close": ({ ctx, url, res, onError }) =>
    void handleClose(ctx, sessionOf(url), res).catch(onError),
  "POST /api/ping": ({ ctx, url, res, onError }) =>
    void handlePing(ctx, sessionOf(url), res).catch(onError),
};

/**
 * Authenticated dispatch: dynamic viewer segment, then the static route table,
 * then a 404 fallback. Mirrors the post-guard ordering of the original handler.
 */
export function dispatchApiRoute(args: RouteArgs): void {
  const { url, req, res } = args;
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "GET") {
    const viewerMatch = VIEWER_PATH.exec(path);
    if (viewerMatch) {
      void handleGetViewer(
        args.ctx,
        decodeURIComponent(viewerMatch[1]),
        res,
      ).catch(args.onError);
      return;
    }
  }

  const route = STATIC_ROUTES[`${method} ${path}`];
  if (route) {
    route(args);
    return;
  }
  sendJson(res, 404, { ok: false, message: "Not found" });
}
