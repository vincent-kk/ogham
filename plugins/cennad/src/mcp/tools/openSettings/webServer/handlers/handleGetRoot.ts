import type { ServerResponse } from 'node:http';

import { escapeJsonForHtml } from '@ogham/http-kit/html';

import type { RouteContext } from '../routing/routeContext.js';

/**
 * GET / — the settings page with its state inlined.
 *
 * The page gets the merged config it renders plus the per-layer state the
 * scope toggle needs. `config` stays a top-level key so the page's existing
 * hydrate path is unchanged; `scope` is what the toggle reads.
 */
export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const config = await ctx.loadConfig();
  const inlineState = escapeJsonForHtml({
    config,
    scope: ctx.loadConfigState(),
  });
  const html = ctx.settingsHtml.replace(
    /["']__CENNAD_STATE__["']/,
    inlineState,
  );
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}
