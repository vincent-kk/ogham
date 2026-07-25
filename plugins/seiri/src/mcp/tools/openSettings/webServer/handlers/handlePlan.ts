import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendJson } from '@ogham/http-kit/response';

import type { RouteContext } from '../routing/routeContext.js';

import { readSaveBody } from './readSaveBody.js';

/**
 * Preview what saving would do to the active host rule channel, writing nothing.
 *
 * Rule docs become standing instructions the model reads every session,
 * so the user sees what is about to be installed in their repository
 * before it lands. The preview runs through the same decision function
 * the save uses, so it cannot promise something the save would not do.
 */
export async function handlePlan(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readSaveBody(req, res);
  if (body === null) return;

  sendJson(res, 200, { success: true, ruleDocs: ctx.planSave(body) });
}
