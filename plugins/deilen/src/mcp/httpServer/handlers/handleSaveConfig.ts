import type { IncomingMessage, ServerResponse } from "node:http";

import { ConfigSchema } from "../../../types/config.js";
import type { RouteContext } from "../routing/routeContext.js";
import { parseJsonBody } from "../utils/parseJsonBody.js";
import { sendJson } from "../utils/sendJson.js";

const MAX_CONFIG_BYTES = 64 * 1024;

/** POST /api/config — validate and persist the submitted Config. */
export async function handleSaveConfig(
  context: RouteContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await parseJsonBody(request, MAX_CONFIG_BYTES);
  } catch (error) {
    sendJson(response, 400, { ok: false, message: (error as Error).message });
    return;
  }
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(response, 400, {
      ok: false,
      message: "Invalid config",
      errors: parsed.error.issues.map((issue) =>
        issue.path.length > 0
          ? `${issue.path.join(".")}: ${issue.message}`
          : issue.message,
      ),
    });
    return;
  }
  // The settings form doesn't carry last_intent (auto-managed at submit time),
  // so preserve the stored value instead of letting the schema default reset it.
  const current = await context.loadConfig();
  try {
    await context.saveConfig({
      ...parsed.data,
      last_intent: current.last_intent,
    });
  } catch (error) {
    sendJson(response, 500, { ok: false, message: (error as Error).message });
    return;
  }
  sendJson(response, 200, { ok: true });
}
