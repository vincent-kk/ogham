import type { IncomingMessage, ServerResponse } from "node:http";

import { ConfigSchema } from "../../../types/config.js";
import type { RouteContext } from "../routing/routeContext.js";
import { parseJsonBody } from "../utils/parseJsonBody.js";
import { sendJson } from "../utils/sendJson.js";

const MAX_CONFIG_BYTES = 64 * 1024;

/** POST /api/config — validate and persist the submitted Config. */
export async function handleSaveConfig(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await parseJsonBody(req, MAX_CONFIG_BYTES);
  } catch (err) {
    sendJson(res, 400, { ok: false, message: (err as Error).message });
    return;
  }
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, {
      ok: false,
      message: "Invalid config",
      errors: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }
  try {
    await ctx.saveConfig(parsed.data);
  } catch (err) {
    sendJson(res, 500, { ok: false, message: (err as Error).message });
    return;
  }
  sendJson(res, 200, { ok: true });
}
