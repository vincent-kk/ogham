import type { ServerResponse } from "node:http";

import { escapeJsonForHtml } from "@ogham/http-kit/html";

import { DEILEN_STATE_PLACEHOLDER_PATTERN } from "../constants/patterns.js";
import type { RouteContext } from "../routing/routeContext.js";

/**
 * GET /settings — serve the settings UI with both config layers injected.
 *
 * The page gets the whole scope state, not just the merged config, because the
 * toggle has to show which layer each value came from.
 */
export function handleGetSettings(
  context: RouteContext,
  response: ServerResponse,
): void {
  const html = context
    .loadSettingsHtml()
    .replace(DEILEN_STATE_PLACEHOLDER_PATTERN, () =>
      escapeJsonForHtml({
        state: context.loadConfigState(),
        token: context.token,
      }),
    );
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  response.end(html);
}
