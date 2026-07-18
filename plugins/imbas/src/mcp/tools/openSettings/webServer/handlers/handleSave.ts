import type { IncomingMessage, ServerResponse } from 'node:http';

import { SettingsSaveBodySchema } from '../../../../../types/settings.js';
import type { RouteContext } from '../routing/routeContext.js';
import { RequestTooLargeError, parseBody } from '../utils/parseBody.js';
import { sendJson } from '../utils/sendJson.js';

export async function handleSave(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch (err) {
    if (err instanceof RequestTooLargeError) {
      sendJson(res, 413, {
        success: false,
        message: 'Request body too large',
      });
      return;
    }
    sendJson(res, 400, {
      success: false,
      message: `Invalid JSON body: ${(err as Error).message}`,
    });
    return;
  }

  const parsed = SettingsSaveBodySchema.safeParse(raw);
  if (!parsed.success) {
    sendJson(res, 400, {
      success: false,
      message: 'Settings validation failed',
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      ),
    });
    return;
  }

  let summary;
  try {
    summary = await ctx.persistSave(parsed.data);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      message: `Failed to save settings: ${(err as Error).message}`,
    });
    return;
  }

  ctx.settleSaved(summary);
  sendJson(res, 200, { success: true, message: 'Saved', summary });
}
