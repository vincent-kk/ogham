/**
 * @file sessionStart.entry.ts
 * @description esbuild entry point for SessionStart hook.
 * Bundled to bridge/session-start.mjs.
 */
import { logHookFailure } from "@ogham/cross-platform/error-log";

import { probeEnvironment } from "./probe/probeEnvironment.js";
import { runSessionStart } from "./sessionStart.js";

async function main() {
  const probe = probeEnvironment({ writeLog: true, pkg: "maencof-lens" });

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
