#!/usr/bin/env node
import { buildBanner } from '../injectStatic.js';

try {
  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: buildBanner(),
      },
    }),
  );
} catch (err) {
  process.stderr.write(
    `[prawf] injectStatic failed: ${(err as Error).message}\n`,
  );
  process.stdout.write(JSON.stringify({ continue: true }));
}
process.exit(0);
