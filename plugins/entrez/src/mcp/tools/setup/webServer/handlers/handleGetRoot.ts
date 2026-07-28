import type { ServerResponse } from "node:http";

import { escapeJsonForHtml } from "@ogham/http-kit/html";

import type { RouteContext } from "../routing/routeContext.js";
import { buildStatus } from "../utils/buildStatus.js";

const STATE_PLACEHOLDER = "window.__ENTREZ_STATE__ = null;";

/** Serve the settings page with current settings injected for prefill. */
export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const [config, credentials] = await Promise.all([
    ctx.loadConfig(),
    ctx.loadCredentials(),
  ]);
  // The page needs the per-layer state too: the toggle has to name the file
  // it will write and say whether a project layer is even available.
  const status = { ...buildStatus(config, credentials), scope: ctx.loadConfigScope() };
  const html = ctx.settingsHtml.replace(
    STATE_PLACEHOLDER,
    `window.__ENTREZ_STATE__ = ${escapeJsonForHtml(status)};`,
  );
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}
