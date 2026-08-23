import type { ServerResponse } from 'node:http';
import { dirname } from 'node:path';

import { escapeJsonForHtml } from '@ogham/http-kit';

import type { RouteContext } from '../routing/routeContext.js';

/**
 * GET / — the settings page with its state inlined.
 *
 * The page gets one document per layer, the per-layer state the scope toggle
 * needs, and the merged config. `config` and `configByScope.project` are the
 * same document: `configByScope` is what the toggle prefills from, and
 * `config` stays a top-level key because the page's `/config` fallback path
 * still hydrates from it.
 */
export async function handleGetRoot(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  const configByScope = await ctx.loadConfigByScope();
  const scope = ctx.loadConfigState();
  const inlineState = escapeJsonForHtml({
    config: configByScope.project,
    configByScope,
    scope,
    activeHome: dirname(scope.paths.user),
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
