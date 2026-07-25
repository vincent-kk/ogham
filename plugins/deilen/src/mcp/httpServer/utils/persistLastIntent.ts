import type { FeedbackIntent } from "../../../types/enums.js";
import type { RouteContext } from "../routing/routeContext.js";

// Persist the chosen submit intent so the next viewer defaults to it. Best-effort
// — a config write must never fail the feedback submission itself.
export async function persistLastIntent(
  context: RouteContext,
  intent: typeof FeedbackIntent.Revise | typeof FeedbackIntent.Discuss,
): Promise<void> {
  try {
    const config = await context.loadConfig();
    if (config.last_intent !== intent)
      await context.saveConfig({ ...config, last_intent: intent });
  } catch {
    /* swallow: last_intent is a convenience default, not part of the contract */
  }
}
