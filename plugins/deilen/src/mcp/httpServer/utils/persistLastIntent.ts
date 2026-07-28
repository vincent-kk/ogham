import type { FeedbackIntent } from "../../../types/enums.js";
import type { RouteContext } from "../routing/routeContext.js";

// Persist the chosen submit intent so the next viewer defaults to it. Best-effort
// — a config write must never fail the feedback submission itself.
//
// It lands in the user layer, and only that layer's document is rewritten. The
// merged config is not a document that belongs anywhere: writing it back would
// bake every project override into the user baseline.
export async function persistLastIntent(
  context: RouteContext,
  intent: typeof FeedbackIntent.Revise | typeof FeedbackIntent.Discuss,
): Promise<void> {
  try {
    const config = await context.loadConfig();
    if (config.last_intent === intent) return;
    const user = context.loadConfigState().layers.user ?? {};
    await context.saveConfig("user", { ...user, last_intent: intent });
  } catch {
    /* swallow: last_intent is a convenience default, not part of the contract */
  }
}
