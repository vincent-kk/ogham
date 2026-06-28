import type { HookCounter } from '../../shared/configTypes.js';
import { isObj } from '../../shared/isObj.js';
import { COUNTER_PATH } from '../../shared/paths.js';
import { safeReadJson } from '../../shared/safeReadJson.js';

import { asNonNegInt } from './asNonNegInt.js';

export function loadCounter(): HookCounter {
  const raw = safeReadJson(COUNTER_PATH);
  if (!isObj(raw)) {
    return { codex: 0, antigravity: 0, claude: 0, is_stale: false };
  }

  const recorded = typeof raw.parent_pid === 'number' ? raw.parent_pid : null;
  if (recorded !== null && recorded !== process.ppid) {
    return { codex: 0, antigravity: 0, claude: 0, is_stale: true };
  }

  return {
    codex: asNonNegInt(raw.codex),
    antigravity: asNonNegInt(raw.antigravity),
    claude: asNonNegInt(raw.claude),
    is_stale: false,
  };
}
