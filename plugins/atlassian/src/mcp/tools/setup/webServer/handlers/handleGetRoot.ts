import type { ServerResponse } from "node:http";
import { resolveInitialConfigScope } from "@ogham/cross-platform";
import type { RouteContext } from "../routing/routeContext.js";
import { buildFormState } from "../utils/buildFormState.js";
import { escapeJsonForHtml } from "@ogham/http-kit";

export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const configByScope = await ctx.loadConfigByScope();
  const credentials = await ctx.loadCredentials();
  const scope = ctx.loadConfigScope();

  const stateData = {
    ...buildFormState(configByScope.project, credentials),
    scope,
    initialScope: resolveInitialConfigScope(scope.layers),
    // One prefill view per layer, so moving the toggle re-seats the form on
    // the sites that layer actually names. The top-level fields above are
    // `configByScope.project` under the names the page already reads.
    configByScope: {
      user: buildFormState(configByScope.user, credentials),
      project: buildFormState(configByScope.project, credentials),
    },
  };

  const html = ctx.settingsHtml.replace(
    /["']__SETTINGS_STATE__["']/,
    escapeJsonForHtml(stateData),
  );
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}
