import type { IncomingMessage, ServerResponse } from "node:http";

import type { RouteContext } from "../routeContext.js";
import { SetupFormDataSchema } from "../../../../../types/setup.js";
import { ENTREZ_TOOL_NAME } from "../../../../../constants/defaults.js";
import { sendJson } from "../utils/sendJson.js";
import { parseBody } from "../utils/parseBody.js";
import { restoreApiKey } from "../utils/maskApiKey.js";

/**
 * POST /submit — validate, restore the masked api_key, EInfo-probe, and only on
 * success persist config (non-secret) + credentials (api_key, 0o600) and close.
 */
export async function handleSubmit(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const parsed = SetupFormDataSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    sendJson(res, 400, {
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const existing = await ctx.loadCredentials();
  const apiKey = restoreApiKey(parsed.data.api_key, existing.api_key);
  const data = { ...parsed.data, api_key: apiKey };

  const test = await ctx.testConnection(data);
  if (!test.success) {
    sendJson(res, 400, {
      success: false,
      message: `Connection test failed — not saved: ${test.message}`,
    });
    return;
  }

  await ctx.saveConfig({
    tool: ENTREZ_TOOL_NAME,
    email: data.email,
    default_db: data.default_db,
    base_url: data.base_url,
    output_path: data.output_path,
    date_tag: data.date_tag,
    default_window_days: data.default_window_days,
  });
  await ctx.saveCredentials({ api_key: apiKey });

  sendJson(res, 200, {
    success: true,
    message: "Configuration saved successfully",
  });
  void ctx.closeServer();
}
