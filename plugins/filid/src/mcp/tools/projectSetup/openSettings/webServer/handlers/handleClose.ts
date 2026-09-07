import type { ServerResponse } from 'node:http';

import { sendJson } from '@ogham/http-kit';

import type { RouteContext } from '../routing/routeContext.js';

/**
 * Acknowledges a close request and begins loopback server teardown.
 *
 * @param ctx - Settings-session lifecycle callbacks.
 * @param res - HTTP response completed before teardown begins.
 */
export async function handleClose(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  sendJson(res, 200, { success: true, message: 'Closing' });
  // Respond first, then tear down — closeServer settles pending waiters
  // with { kind: 'closed' } and closes remaining connections.
  void ctx.closeServer();
}
