import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteContext } from './route-context.js';
import { sendJson } from './utils/send-json.js';
import { handleGetRoot } from './handlers/handle-get-root.js';
import { handleStatus } from './handlers/handle-status.js';
import { handleTest } from './handlers/handle-test.js';
import { handleSubmit } from './handlers/handle-submit.js';

export type { RouteContext } from './route-context.js';

/** Create an HTTP request handler with the given route context. Centralizes
 *  CSRF and method/path dispatch; per-route logic lives in handlers/. */
export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse) => {
    ctx.resetTimer();

    // Server binds to 127.0.0.1 only; the setup page and its XHR calls share
    // the same origin, so no CORS headers are needed. A wildcard ACAO would
    // let any local browser tab POST to /submit during the setup window.

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    // CSRF defense: POST endpoints (which mutate credentials) require a JSON
    // Content-Type. A cross-origin text/plain POST (a "simple" CORS request
    // with no preflight) carrying JSON would otherwise be parsed and saved.
    if (req.method === 'POST'
      && !(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      sendJson(res, 415, { success: false, message: 'Content-Type must be application/json' });
      return;
    }

    const handleError = (err: unknown): void => {
      const message = err instanceof Error ? err.message : 'Internal server error';
      sendJson(res, 500, { success: false, message });
    };

    if (path === '/' && req.method === 'GET') {
      handleGetRoot(ctx, res).catch(handleError);
    } else if (path === '/status' && req.method === 'GET') {
      handleStatus(ctx, res).catch(handleError);
    } else if (path === '/test' && req.method === 'POST') {
      handleTest(ctx, req, res).catch(handleError);
    } else if (path === '/submit' && req.method === 'POST') {
      handleSubmit(ctx, req, res).catch(handleError);
    } else {
      sendJson(res, 404, { success: false, message: 'Not found' });
    }
  };
}
