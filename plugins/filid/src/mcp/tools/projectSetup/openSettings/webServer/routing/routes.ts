import type { IncomingMessage, ServerResponse } from 'node:http';

import { inspectRequest, sendJson } from '@ogham/http-kit';

import { handleClose } from '../handlers/handleClose.js';
import { handleGetRoot } from '../handlers/handleGetRoot.js';
import { handleSave } from '../handlers/handleSave.js';

import type { RouteContext } from './routeContext.js';

/**
 * Creates the authenticated request router for the settings server.
 *
 * @param ctx - Session token, page state, persistence, and lifecycle callbacks.
 * @returns A Node HTTP request handler for the three settings routes.
 */
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

    // Shared canon: loopback Host (rebinding) → token → POST Origin (CSRF) →
    // Content-Type. The Host + Origin checks block DNS-rebinding even if the
    // one-time token leaks via referer/history.
    const verdict = inspectRequest({
      host: req.headers.host,
      method: req.method ?? 'GET',
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
      expectedToken: ctx.token,
      providedToken: url.searchParams.get('token') ?? '',
    });
    if (!verdict.ok) {
      sendJson(res, verdict.status, {
        success: false,
        message: verdict.message,
      });
      return;
    }

    // headersSent: a throw after a partial response must not writeHead twice —
    // that would throw inside this handler.
    const onError = (err: unknown): void => {
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      if (!res.headersSent) sendJson(res, 500, { success: false, message });
      else res.destroy();
    };

    if (path === '/' && req.method === 'GET')
      handleGetRoot(ctx, res).catch(onError);
    else if (path === '/save' && req.method === 'POST')
      handleSave(ctx, req, res).catch(onError);
    else if (path === '/close' && req.method === 'POST')
      handleClose(ctx, res).catch(onError);
    else sendJson(res, 404, { success: false, message: 'Not found' });
  };
}
