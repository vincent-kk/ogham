import type { ServerResponse } from "node:http";

import { handleGetAsset } from "../handlers/handleGetAsset.js";

import type { RouteContext } from "./routeContext.js";

const ASSET_PATH = /^\/assets\/([^/]+)$/;

/**
 * Pre-auth asset branch: `/assets/<chunk>` is token-exempt (public library).
 * Returns true when the request was handled here, false to continue routing.
 */
export function tryAssetRoute(
  context: RouteContext,
  path: string,
  method: string,
  response: ServerResponse,
): boolean {
  const match = ASSET_PATH.exec(path);
  if (match && method === "GET") {
    handleGetAsset(context, decodeURIComponent(match[1]), response);
    return true;
  }
  return false;
}
