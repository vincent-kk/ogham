#!/usr/bin/env node
import { loadConfig } from '../../shared/loadConfig.js';
import { nowIso } from '../../shared/nowIso.js';
import { selfProvider } from '../../shared/selfProvider.js';
import { buildDynamicPayload } from '../injectDynamic.js';
import { loadCounter } from '../utils/loadCounter.js';
import { readPromptFromStdin } from '../utils/readPromptFromStdin.js';

// Inside the hook's 3s budget, leaving room for the disk reads and the write.
const STDIN_TIMEOUT_MS = 2000;

try {
  const prompt = await readPromptFromStdin(STDIN_TIMEOUT_MS);
  const payload = buildDynamicPayload(
    loadConfig(),
    loadCounter(),
    prompt,
    selfProvider(),
  );
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
    `[cennad][${nowIso()}] injectDynamic failed: ${(err as Error).message}\n`,
  );
  process.stdout.write(JSON.stringify({ continue: true }));
}
process.exit(0);
