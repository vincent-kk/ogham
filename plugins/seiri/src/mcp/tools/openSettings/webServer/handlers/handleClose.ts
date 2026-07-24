import type { ServerResponse } from 'node:http';

import { sendJson } from '@ogham/http-kit/response';

import type { RouteContext } from '../routing/routeContext.js';

export function handleClose(ctx: RouteContext, res: ServerResponse): void {
  sendJson(res, 200, { success: true, message: 'Closing' });
  // Respond first, then tear down — closeServer settles pending waiters
  // with { kind: 'closed' } and drops remaining connections.
  void ctx.closeServer();
}
