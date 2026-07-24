import type { IncomingMessage, ServerResponse } from 'node:http';

import { inspectRequest } from '@ogham/http-guard/guard';

import {
  HttpMethod,
  LOOPBACK_HOST,
  Route,
} from '../../../../../constants/http.js';
import { handleClose } from '../handlers/handleClose.js';
import { handleGetRoot } from '../handlers/handleGetRoot.js';
import { handlePlan } from '../handlers/handlePlan.js';
import { handleSave } from '../handlers/handleSave.js';
import { sendJson } from '../utils/sendJson.js';

import type { RouteContext } from './routeContext.js';

export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    ctx.resetTimer();

    const url = new URL(
      req.url ?? Route.ROOT,
      `http://${req.headers.host ?? LOOPBACK_HOST}`,
    );
    const path = url.pathname;

    // Shared guard, same order everywhere: loopback Host (rebinding) →
    // one-time token → POST Origin (CSRF) → Content-Type. Host and Origin
    // hold even if the token leaks through referer or history.
    const verdict = inspectRequest({
      host: req.headers.host,
      method: req.method ?? HttpMethod.GET,
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

    const onError = (err: unknown): void => {
      sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : 'Internal server error',
      });
    };

    if (path === Route.ROOT && req.method === HttpMethod.GET)
      handleGetRoot(ctx, res);
    else if (path === Route.PLAN && req.method === HttpMethod.POST)
      handlePlan(ctx, req, res).catch(onError);
    else if (path === Route.SAVE && req.method === HttpMethod.POST)
      handleSave(ctx, req, res).catch(onError);
    else if (path === Route.CLOSE && req.method === HttpMethod.POST)
      handleClose(ctx, res);
    else sendJson(res, 404, { success: false, message: 'Not found' });
  };
}
