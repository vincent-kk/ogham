import type { Counter } from '../../../types/index.js';
import { getParentPid } from '../../../utils/parentPid.js';

import { loadCounter } from './loadCounter.js';

export async function getCounter(): Promise<Counter> {
  const current = await loadCounter();
  const ppid = getParentPid();
  if (!current || current.parent_pid !== ppid)
    return { parent_pid: ppid, codex: 0, antigravity: 0, claude: 0 };

  return current;
}
