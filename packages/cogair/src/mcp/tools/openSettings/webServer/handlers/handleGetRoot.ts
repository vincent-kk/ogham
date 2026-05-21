import type { ServerResponse } from 'node:http';

import type { RouteContext } from '../routing/routeContext.js';
import { escapeJsonForHtml } from '../utils/escapeJsonForHtml.js';

export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const config = await ctx.loadConfig();
  const inlineState = escapeJsonForHtml(config);
  const html = ctx.settingsHtml.replace(
    /["']__COGAIR_STATE__["']/,
    inlineState,
  );
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}
