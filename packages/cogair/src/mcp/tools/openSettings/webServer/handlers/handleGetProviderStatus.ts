import type { ServerResponse } from 'node:http';

import { checkExecutable } from '../../../../../lib/checkExecutable.js';
import { sendJson } from '../utils/sendJson.js';

export async function handleGetProviderStatus(
  res: ServerResponse,
): Promise<void> {
  const [codex, gemini] = await Promise.all([
    checkExecutable('codex'),
    checkExecutable('gemini'),
  ]);
  sendJson(res, 200, { codex, gemini });
}
