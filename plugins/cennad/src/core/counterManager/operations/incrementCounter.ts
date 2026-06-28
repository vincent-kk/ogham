import { COUNTER_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import type { Counter, Provider } from '../../../types/index.js';

import { getCounter } from './getCounter.js';

export async function incrementCounter(provider: Provider): Promise<Counter> {
  const current = await getCounter();
  const next: Counter = {
    parent_pid: current.parent_pid,
    codex: current.codex + (provider === 'codex' ? 1 : 0),
    antigravity: current.antigravity + (provider === 'antigravity' ? 1 : 0),
  };
  await atomicWrite(COUNTER_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
