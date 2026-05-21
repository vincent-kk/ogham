#!/usr/bin/env node
import { loadConfig } from '../shared/loadConfig.js';
import { nowIso } from '../shared/nowIso.js';

import { buildDynamicPayload } from './injectDynamic.js';
import { loadCounter } from './utils/loadCounter.js';

try {
  const payload = buildDynamicPayload(loadConfig(), loadCounter());
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: payload,
      },
    }),
  );
} catch (err) {
  process.stderr.write(
    `[cogair][${nowIso()}] injectDynamic failed: ${(err as Error).message}\n`,
  );
  process.stdout.write(JSON.stringify({ continue: true }));
}
process.exit(0);
