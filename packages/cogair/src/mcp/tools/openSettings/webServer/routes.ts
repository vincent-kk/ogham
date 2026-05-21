import type { IncomingMessage, ServerResponse } from 'node:http';

import { verifyToken } from '../../../../core/authToken/index.js';

import { handleClose } from './handlers/handleClose.js';
import { handleGetConfig } from './handlers/handleGetConfig.js';
import { handleGetRoot } from './handlers/handleGetRoot.js';
import { handleSave } from './handlers/handleSave.js';
import type { RouteContext } from './routeContext.js';
import { sendJson } from './utils/sendJson.js';

export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    ctx.resetTimer();

    const url = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? '127.0.0.1'}`,
    );
    const path = url.pathname;
    const provided = url.searchParams.get('token') ?? '';

    if (!verifyToken(ctx.token, provided)) {
      sendJson(res, 401, { success: false, message: 'Invalid token' });
      return;
    }

    if (
      req.method === 'POST' &&
      !(req.headers['content-type'] ?? '')
        .toLowerCase()
        .startsWith('application/json')
    ) {
      sendJson(res, 415, {
        success: false,
        message: 'Content-Type must be application/json',
      });
      return;
    }

    const onError = (err: unknown): void => {
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      sendJson(res, 500, { success: false, message });
    };

    if (path === '/' && req.method === 'GET') {
      handleGetRoot(ctx, res).catch(onError);
    } else if (path === '/config' && req.method === 'GET') {
      handleGetConfig(ctx, res).catch(onError);
    } else if (path === '/save' && req.method === 'POST') {
      handleSave(ctx, req, res).catch(onError);
    } else if (path === '/close' && req.method === 'POST') {
      handleClose(ctx, res).catch(onError);
    } else {
      sendJson(res, 404, { success: false, message: 'Not found' });
    }
  };
}
