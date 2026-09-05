import type { ServerResponse } from 'node:http';

import { escapeJsonForHtml } from '@ogham/http-kit';

import type { RouteContext } from '../routing/routeContext.js';

/**
 * Renders the settings page with a freshly loaded escaped state payload.
 *
 * @param ctx - Settings-session page template and state loader.
 * @param res - HTTP response receiving the rendered HTML.
 */
export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const state = ctx.loadState();
  const inlineState = escapeJsonForHtml(state);
  const html = ctx.settingsHtml.replace(/["']__FILID_STATE__["']/, inlineState);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}
