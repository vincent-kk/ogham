import type { IncomingMessage, ServerResponse } from "node:http";

import { handleClose } from "../handlers/handleClose.js";
import { handleGetConfig } from "../handlers/handleGetConfig.js";
import { handleGetImage } from "../handlers/handleGetImage.js";
import { handleGetSettings } from "../handlers/handleGetSettings.js";
import { handleGetViewer } from "../handlers/handleGetViewer.js";
import { handleGetViewerData } from "../handlers/handleGetViewerData.js";
import { handlePing } from "../handlers/handlePing.js";
import { handlePostFeedback } from "../handlers/handlePostFeedback.js";
import { handleSaveConfig } from "../handlers/handleSaveConfig.js";
import { sendJson } from "../utils/sendJson.js";

import type { RouteContext } from "./routeContext.js";

const VIEWER_PATH = /^\/r\/([^/]+)$/;
const IMAGE_PATH = /^\/api\/image\/([^/]+)\/(\d+)$/;

interface RouteArgs {
  context: RouteContext;
  url: URL;
  request: IncomingMessage;
  response: ServerResponse;
  onError: (error: unknown) => void;
}

type RouteHandler = (args: RouteArgs) => void;

const sessionOf = (url: URL): string => url.searchParams.get("session") ?? "";

const STATIC_ROUTES: Record<string, RouteHandler> = {
  "GET /api/viewer": ({ context, url, response, onError }) =>
    void handleGetViewerData(context, url, response).catch(onError),
  "GET /settings": ({ context, response, onError }) =>
    void handleGetSettings(context, response).catch(onError),
  "GET /api/config": ({ context, response, onError }) =>
    void handleGetConfig(context, response).catch(onError),
  "POST /api/config": ({ context, request, response, onError }) =>
    void handleSaveConfig(context, request, response).catch(onError),
  "POST /api/feedback": ({ context, url, request, response, onError }) =>
    void handlePostFeedback(context, sessionOf(url), request, response).catch(
      onError,
    ),
  "POST /api/close": ({ context, url, response, onError }) =>
    void handleClose(context, sessionOf(url), response).catch(onError),
  "POST /api/ping": ({ context, url, response, onError }) =>
    void handlePing(context, sessionOf(url), response).catch(onError),
};

/**
 * Authenticated dispatch: dynamic viewer segment, then the static route table,
 * then a 404 fallback. Mirrors the post-guard ordering of the original handler.
 */
export function dispatchApiRoute(args: RouteArgs): void {
  const { url, request, response } = args;
  const path = url.pathname;
  const method = request.method ?? "GET";

  if (method === "GET") {
    const viewerMatch = VIEWER_PATH.exec(path);
    if (viewerMatch) {
      void handleGetViewer(
        args.context,
        decodeURIComponent(viewerMatch[1]),
        response,
      ).catch(args.onError);
      return;
    }
    const imageMatch = IMAGE_PATH.exec(path);
    if (imageMatch) {
      void handleGetImage(
        args.context,
        decodeURIComponent(imageMatch[1]),
        Number(imageMatch[2]),
        response,
      ).catch(args.onError);
      return;
    }
  }

  const route = STATIC_ROUTES[`${method} ${path}`];
  if (route) {
    route(args);
    return;
  }
  sendJson(response, 404, { ok: false, message: "Not found" });
}
