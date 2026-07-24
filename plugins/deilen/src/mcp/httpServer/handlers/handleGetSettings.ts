import type { ServerResponse } from "node:http";

import { escapeJsonForHtml } from "@ogham/http-kit/html";

import { DEILEN_STATE_PLACEHOLDER_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";

/** GET /settings — serve the settings UI with the current Config injected. */
export async function handleGetSettings(
  context: RouteContext,
  response: ServerResponse,
): Promise<void> {
  const config = await context.loadConfig();
  const html = context
    .loadSettingsHtml()
    .replace(DEILEN_STATE_PLACEHOLDER_PATTERN, () =>
      escapeJsonForHtml({ config, token: context.token }),
    );
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  response.end(html);
}
