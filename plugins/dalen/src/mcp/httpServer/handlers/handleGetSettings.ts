import type { ServerResponse } from "node:http";

import type { RouteContext } from "../routing/routeContext.js";
import { escapeJsonForHtml } from "../utils/escapeJsonForHtml.js";

/** GET /settings — serve the settings UI with the current Config injected. */
export async function handleGetSettings(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const config = await ctx.loadConfig();
  const html = ctx
    .loadSettingsHtml()
    .replace(
      /["']__DALEN_STATE__["']/,
      escapeJsonForHtml({ config, token: ctx.token }),
    );
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}
