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
  const [configByScope, credentials] = await Promise.all([
    ctx.loadConfigByScope(),
    ctx.loadCredentials(),
  ]);
  // The page needs the per-layer state too: the toggle has to name the file it
  // will write, say whether a project layer is even available, and re-seat the
  // form on the layer it names. The top-level fields stay the effective view —
  // `configByScope.project` is the same document under a name the toggle reads.
  const status = {
    ...buildStatus(configByScope.project, credentials),
    scope: ctx.loadConfigScope(),
    configByScope: {
      user: buildStatus(configByScope.user, credentials),
      project: buildStatus(configByScope.project, credentials),
    },
  };
  const html = ctx.settingsHtml.replace(
    STATE_PLACEHOLDER,
    `window.__ENTREZ_STATE__ = ${escapeJsonForHtml(status)};`,
  );
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}
