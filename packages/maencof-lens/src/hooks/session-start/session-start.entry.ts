/**
 * @file session-start.entry.ts
 * @description esbuild entry point for SessionStart hook.
 * Bundled to bridge/session-start.mjs.
 */
import { logHookFailure } from "@ogham/cross-platform/error-log";
import { selfProbe } from "@ogham/cross-platform/self-probe";

import { runSessionStart } from "./session-start.js";

async function main() {
  // Diagnose node/git/PATH/CLAUDE_PLUGIN_ROOT on the first hook entry of a
  // session. Errors append to ~/.claude/plugins/maencof-lens/error-log.json
  // so silent hook failures (Windows PATH lacking node, etc.) are observable.
  const probe = await selfProbe({ writeLog: true, pkg: "maencof-lens" });

  let result;
  try {
    result = await runSessionStart(process.cwd());
  } catch (e) {
    logHookFailure("maencof-lens", "session-start", e);
    result = {};
  }

  const baseContext = result.hookSpecificOutput?.additionalContext;
  let context = baseContext;

  if (probe.errors.length > 0) {
    const warning =
      "[maencof-lens] hook bootstrap diagnostic — some hooks may not work:\n" +
      probe.errors.map((e) => `  - ${e}`).join("\n") +
      "\nSee ~/.claude/plugins/maencof-lens/error-log.json for details.";
    context = context ? `${context}\n\n${warning}` : warning;
  }

  if (context) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          ...(result.hookSpecificOutput ?? {}),
          hookEventName: "SessionStart",
          additionalContext: context,
        },
      }),
    );
  }
}

main().catch((e) => {
  logHookFailure("maencof-lens", "session-start", e);
  process.exit(0);
});
