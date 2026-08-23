import { existsSync } from 'node:fs';

import { resolveHostSessionIdentity } from '../../../utils/hostSessionIdentity.js';
import type { HookCounter } from '../../shared/configTypes.js';
import { isPlainObject } from '../../shared/isPlainObject.js';
import { COUNTER_PATH } from '../../shared/paths.js';
import { safeReadJson } from '../../shared/safeReadJson.js';

import { asNonNegInt } from './asNonNegInt.js';

export function loadCounter(): HookCounter {
  const empty = (
    status: Exclude<HookCounter['status'], 'measured'>,
  ): HookCounter => ({ status, codex: 0, antigravity: 0, claude: 0 });
  const hostSessionId = resolveHostSessionIdentity();
  if (hostSessionId === null) return empty('unidentified');

  if (!existsSync(COUNTER_PATH)) return empty('missing');
  const raw = safeReadJson(COUNTER_PATH);
  if (!isPlainObject(raw)) return empty('invalid');

  const currentId =
    typeof raw.host_session_id === 'string' && raw.host_session_id.trim() !== ''
      ? raw.host_session_id.trim()
      : Number.isInteger(raw.parent_pid) && Number(raw.parent_pid) > 0
        ? `claude-pid:${String(raw.parent_pid)}`
        : null;
  if (currentId === null) return empty('invalid');
  if (currentId !== hostSessionId) return empty('stale');

  return {
    status: 'measured',
    codex: asNonNegInt(raw.codex),
    antigravity: asNonNegInt(raw.antigravity),
    claude: asNonNegInt(raw.claude),
  };
}
