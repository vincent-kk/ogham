import type { DialogueConfig } from '../types/dialogue-config.js';

export const DEFAULT_DIALOGUE_CONFIG: DialogueConfig = {
  schema_version: 1,
  injection: { enabled: true, budget_chars: 2000 },
  session_recap: { enabled: true },
};

/** Environment variable that, when set to `"1"`, disables all dialogue injection. */
export const DIALOGUE_DISABLE_ENV = 'MAENCOF_DISABLE_DIALOGUE';

/** `.maencof-meta/` 하위 dialogue config 파일 이름. */
export const DIALOGUE_CONFIG_FILE = 'dialogue-config.json';
