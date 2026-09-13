import type { ServerResponse } from 'node:http';

import { resolveInitialConfigScope } from '@ogham/cross-platform';
import { sendJson } from '@ogham/http-kit';

import type { RouteContext } from '../routing/routeContext.js';

/**
 * GET /config — both config layers, the merge, and what the project layer
 * overrode. The page needs all of it to draw the scope toggle and badges.
 */
export function handleGetConfig(ctx: RouteContext, res: ServerResponse): void {
  const state = ctx.loadConfigState();
  sendJson(res, 200, {
    state,
    initialScope: resolveInitialConfigScope(state.layers),
  });
}
