import type { ServerResponse } from 'node:http';

import type { RouteContext } from '../routing/routeContext.js';
import { sendJson } from '../utils/sendJson.js';

export async function handleClose(
  ctx: RouteContext,
  res: ServerResponse,
): Promise<void> {
  sendJson(res, 200, { success: true, message: 'Closing' });
  // Defer the actual close so the response can flush before the socket goes away.
  setImmediate(() => {
    void ctx.closeServer();
  });
}
