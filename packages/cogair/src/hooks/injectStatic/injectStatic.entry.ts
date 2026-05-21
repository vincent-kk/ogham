#!/usr/bin/env node
import { loadConfig } from '../shared/loadConfig.js';
import { nowIso } from '../shared/nowIso.js';

import { buildStaticPayload } from './injectStatic.js';

try {
  const payload = buildStaticPayload(loadConfig());
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: payload,
      },
    }),
  );
} catch (err) {
  process.stderr.write(
    `[cogair][${nowIso()}] injectStatic failed: ${(err as Error).message}\n`,
  );
  process.stdout.write(JSON.stringify({ continue: true }));
}
process.exit(0);
