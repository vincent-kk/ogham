import type { IncomingMessage, ServerResponse } from 'node:http';

import { describeBodyError, parseBody } from '@ogham/http-kit/body';
import { sendJson } from '@ogham/http-kit/response';

import { type SaveBody, SaveBodySchema } from '../../types/settingsTypes.js';

/**
 * Parse and validate a /plan or /save body, answering the client itself
 * on rejection. Returns `null` once a response has been sent, so callers
 * read as `if (body === null) return;`.
 *
 * Shared by both endpoints deliberately: a preview that accepted a body
 * the save would reject could show a diff that can never be applied.
 */
export async function readSaveBody(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SaveBody | null> {
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch (err) {
    const { status, message } = describeBodyError(err);
    sendJson(res, status, { success: false, message });
    return null;
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
    return null;
  }

  return parsed.data;
}
