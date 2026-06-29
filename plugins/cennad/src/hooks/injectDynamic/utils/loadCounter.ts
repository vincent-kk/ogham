import type { HookCounter } from '../../shared/configTypes.js';
import { isPlainObject } from '../../shared/isPlainObject.js';
import { COUNTER_PATH } from '../../shared/paths.js';
import { safeReadJson } from '../../shared/safeReadJson.js';

import { asNonNegInt } from './asNonNegInt.js';

export function loadCounter(): HookCounter {
  const config = safeReadJson(COUNTER_PATH);
  if (!isPlainObject(config))
    return { codex: 0, antigravity: 0, claude: 0, is_stale: false };
  const recorded =
    typeof config.parent_pid === 'number' ? config.parent_pid : null;
  if (recorded !== null && recorded !== process.ppid)
    return { codex: 0, antigravity: 0, claude: 0, is_stale: true };
  return {
    codex: asNonNegInt(config.codex),
    antigravity: asNonNegInt(config.antigravity),
    claude: asNonNegInt(config.claude),
    is_stale: false,
  };
}
