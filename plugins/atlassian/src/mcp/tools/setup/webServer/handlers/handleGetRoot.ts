import type { ServerResponse } from "node:http";
import type { RouteContext } from "../routing/routeContext.js";
import { buildStatus } from "../utils/buildStatus.js";
import { buildEditableSitesState } from "../utils/buildEditableSitesState.js";
import { escapeJsonForHtml } from "@ogham/http-kit/html";

export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const config = await ctx.loadConfig();
  const credentials = await ctx.loadCredentials();
  const status = buildStatus(config);

  const jiraSites = config.jira ?? [];
  const confSites = config.confluence ?? [];
  const hasJira = jiraSites.length > 0;
  const hasConf = confSites.length > 0;
  const hasOnPremSite =
    jiraSites.some((s) => !s.is_cloud) || confSites.some((s) => !s.is_cloud);

  const stateData = {
    ...status,
    ...(hasJira
      ? { jira: buildEditableSitesState(jiraSites, credentials.jira) }
      : {}),
    ...(hasConf
      ? {
          confluence: buildEditableSitesState(
            confSites,
            credentials.confluence,
          ),
        }
      : {}),
    deployment_type: hasOnPremSite ? "onprem" : "cloud",
    // Which layer the form writes. The page picks; `user` is the sensible
    // default because a site and account belong to a person, not a checkout.
    scope: ctx.loadConfigScope(),
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
