import type { Counter } from '../../../types/index.js';
import { resolveHostSessionIdentity } from '../../../utils/hostSessionIdentity.js';

import { loadCounter } from './loadCounter.js';

export async function getCounter(): Promise<Counter | null> {
  const hostSessionId = resolveHostSessionIdentity();
  if (hostSessionId === null) return null;

  const current = await loadCounter();
  if (!current || current.host_session_id !== hostSessionId)
    return {
      host_session_id: hostSessionId,
      codex: 0,
      antigravity: 0,
      claude: 0,
    };

  return current;
}
