import type { ServerResponse } from 'node:http';

import { sendJson } from '@ogham/http-kit';

import type { RouteContext } from '../routing/routeContext.js';

/**
 * GET /config — both config layers, the merge, and what the project layer
 * overrode. The page needs all of it to draw the scope toggle and badges.
 */
export function handleGetConfig(ctx: RouteContext, res: ServerResponse): void {
  sendJson(res, 200, { state: ctx.loadConfigState() });
}
