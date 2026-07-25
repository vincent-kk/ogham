import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendJson } from '@ogham/http-kit/response';

import type { RouteContext } from '../routing/routeContext.js';

import { readSaveBody } from './readSaveBody.js';

export async function handleSave(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readSaveBody(req, res);
  if (body === null) return;

  let summary;
  try {
    summary = ctx.persistSave(body);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      message: `Failed to save settings: ${(err as Error).message}`,
    });
    return;
  }

  // A stale preview keeps the session waiting while the page replans. It
  // did not save the rule selection, so reporting a saved settle event
  // would resume the setup flow before the user reviews the newer state.
  if (!summary.ruleDocs.applied) {
    sendJson(res, 200, {
      success: true,
      message: 'Preview changed',
      ruleDocs: summary.ruleDocs,
    });
    return;
  }

  // Both "Save" and "Save & close" settle the long-poll so the session
  // resumes in the same turn; they differ only in whether the browser
  // then closes the window.
  ctx.settleSaved(summary);
  sendJson(res, 200, {
    success: true,
    message: 'Saved',
    ruleDocs: summary.ruleDocs,
  });
}
