import type { ServerResponse } from 'node:http';

import { escapeJsonForHtml } from '@ogham/http-kit';

import type { RouteContext } from '../routing/routeContext.js';

export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const state = await ctx.loadState();
  const inlineState = escapeJsonForHtml(state);
  const html = ctx.settingsHtml.replace(/["']__IMBAS_STATE__["']/, inlineState);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}
