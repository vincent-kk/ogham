/**
 * @file session-start.entry.ts
 * @description esbuild entry point for SessionStart hook.
 * Bundled to bridge/session-start.mjs.
 */
import { runSessionStart } from '../session-start.js';

async function main() {
  const cwd = process.cwd();
  const result = await runSessionStart(cwd);

  if (result.hookSpecificOutput?.additionalContext) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          ...result.hookSpecificOutput,
        },
      }),
    );
  }
}

main().catch(() => {
  // Silent exit — do not block Claude Code
  process.exit(0);
});
