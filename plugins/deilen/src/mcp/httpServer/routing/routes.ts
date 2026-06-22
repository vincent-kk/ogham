import type { IncomingMessage, ServerResponse } from "node:http";

import { verifyToken } from "../../../core/authToken/verifyToken.js";
import { handleClose } from "../handlers/handleClose.js";
import { handleGetAsset } from "../handlers/handleGetAsset.js";
import { handleGetConfig } from "../handlers/handleGetConfig.js";
import { handleGetViewer } from "../handlers/handleGetViewer.js";
import { handleGetViewerData } from "../handlers/handleGetViewerData.js";
import { handleGetSettings } from "../handlers/handleGetSettings.js";
import { handlePing } from "../handlers/handlePing.js";
import { handlePostFeedback } from "../handlers/handlePostFeedback.js";
import { handleSaveConfig } from "../handlers/handleSaveConfig.js";
import { sendJson } from "../utils/sendJson.js";

import type { RouteContext } from "./routeContext.js";

const VIEWER_PATH = /^\/r\/([^/]+)$/;
const ASSET_PATH = /^\/assets\/([^/]+)$/;

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

    const assetMatch = ASSET_PATH.exec(path);
    if (assetMatch && method === "GET") {
      handleGetAsset(ctx, decodeURIComponent(assetMatch[1]), res);
      return;
    }

    if (!verifyToken(ctx.token, url.searchParams.get("token") ?? "")) {
      sendJson(res, 401, { ok: false, message: "Invalid token" });
      return;
    }

    if (method === "POST") {
      const ct = (req.headers["content-type"] ?? "").toLowerCase();
      if (
        !ct.startsWith("application/json") &&
        !ct.startsWith("multipart/form-data")
      ) {
        sendJson(res, 415, { ok: false, message: "Unsupported Content-Type" });
        return;
      }
    }

    const viewerMatch = VIEWER_PATH.exec(path);
    if (viewerMatch && method === "GET") {
      handleGetViewer(ctx, decodeURIComponent(viewerMatch[1]), res).catch(
        onError,
      );
      return;
    }
    if (path === "/api/viewer" && method === "GET") {
      handleGetViewerData(ctx, url, res).catch(onError);
      return;
    }
    if (path === "/settings" && method === "GET") {
      handleGetSettings(ctx, res).catch(onError);
      return;
    }
    if (path === "/api/config" && method === "GET") {
      handleGetConfig(ctx, res).catch(onError);
      return;
    }
    if (path === "/api/config" && method === "POST") {
      handleSaveConfig(ctx, req, res).catch(onError);
      return;
    }
    if (path === "/api/feedback" && method === "POST") {
      const session = url.searchParams.get("session") ?? "";
      handlePostFeedback(ctx, session, req, res).catch(onError);
      return;
    }
    if (path === "/api/close" && method === "POST") {
      const session = url.searchParams.get("session") ?? "";
      handleClose(ctx, session, res).catch(onError);
      return;
    }
    if (path === "/api/ping" && method === "POST") {
      handlePing(res);
      return;
    }
    sendJson(res, 404, { ok: false, message: "Not found" });
  };
}
