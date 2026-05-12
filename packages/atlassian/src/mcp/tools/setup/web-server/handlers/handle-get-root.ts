import type { ServerResponse } from 'node:http';
import type { RouteContext } from '../route-context.js';
import { buildStatus } from '../utils/build-status.js';
import { buildEditableSitesState } from '../utils/build-editable-sites-state.js';
import { escapeJsonForHtml } from '../utils/escape-json-for-html.js';

export async function handleGetRoot(ctx: RouteContext, res: ServerResponse): Promise<void> {
  const config = await ctx.loadConfig();
  const credentials = await ctx.loadCredentials();
  const status = buildStatus(config);

  const jiraSites = config.jira ?? [];
  const confSites = config.confluence ?? [];
  const hasJira = jiraSites.length > 0;
  const hasConf = confSites.length > 0;
  const hasOnPremSite = jiraSites.some((s) => !s.is_cloud)
    || confSites.some((s) => !s.is_cloud);

  const stateData = {
    ...status,
    ...(hasJira ? { jira: buildEditableSitesState(jiraSites, credentials.jira) } : {}),
    ...(hasConf ? { confluence: buildEditableSitesState(confSites, credentials.confluence) } : {}),
    deployment_type: hasOnPremSite ? 'onprem' : 'cloud',
  };

  const html = ctx.setupHtml.replace(/["']__SETUP_STATE__["']/, escapeJsonForHtml(stateData));
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}
