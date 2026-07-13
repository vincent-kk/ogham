import type { ServerResponse } from 'node:http';

import { getAvailableModels } from '../../../../../core/agyModels/index.js';
import { getCodexModels } from '../../../../../core/codexModels/index.js';
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
  // Only probe a catalog when that binary exists; both getters degrade to a safe
  // list on any failure so the settings UI never blocks on them.
  const [agyModels, codexModels] = await Promise.all([
    antigravity.status === 'available' ? getAvailableModels() : [],
    codex.status === 'available' ? getCodexModels() : [],
  ]);
  sendJson(res, 200, { antigravity, agyModels, codex, codexModels, claude });
}
