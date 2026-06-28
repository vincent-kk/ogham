import type { ServerResponse } from 'node:http';

import { getAvailableModels } from '../../../../../core/agyModels/index.js';
import { checkExecutable } from '../../../../../lib/checkExecutable.js';
import { sendJson } from '../utils/sendJson.js';

export async function handleGetProviderStatus(
  res: ServerResponse,
): Promise<void> {
  const [antigravity, codex, claude] = await Promise.all([
    checkExecutable('agy'),
    checkExecutable('codex'),
    checkExecutable('claude'),
  ]);
  // Only probe agy models when the binary exists; getAvailableModels degrades
  // to [] on any failure so the settings UI never blocks on it.
  const agyModels = antigravity.available ? await getAvailableModels() : [];
  sendJson(res, 200, { antigravity, agyModels, codex, claude });
}
