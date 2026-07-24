import type { IncomingMessage, ServerResponse } from 'node:http';

import { describeBodyError, parseBody } from '@ogham/http-kit/body';
import { sendJson } from '@ogham/http-kit/response';

import { SaveBodySchema } from '../../types/settingsTypes.js';
import type { RouteContext } from '../routing/routeContext.js';

export async function handleSave(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch (err) {
    const { status, message } = describeBodyError(err);
    sendJson(res, status, { success: false, message });
    return;
  }

  const parsed = SaveBodySchema.safeParse(raw);
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
    summary = ctx.persistSave(parsed.data);
  } catch (err) {
    sendJson(res, 500, {
      success: false,
      message: `Failed to save settings: ${(err as Error).message}`,
    });
    return;
  }

  // Both "Save" and "Save & Close" settle the long-poll so Claude resumes; they
  // differ only in whether the browser then closes the window (client-side).
  ctx.settleSaved(summary);
  sendJson(res, 200, {
    success: true,
    message: 'Saved',
    ruleDocs: summary.ruleDocs,
  });
}
