import type { IncomingMessage, ServerResponse } from "node:http";

import type { RouteContext } from "../routeContext.js";
import { SetupFormDataSchema } from "../../../../../types/setup.js";
import { sendJson } from "../utils/sendJson.js";
import { parseBody } from "../utils/parseBody.js";
import { restoreApiKey } from "../utils/maskApiKey.js";

/** POST /test — EInfo reachability probe (does not save). */
export async function handleTest(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const parsed = SetupFormDataSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    sendJson(res, 400, {
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }
  const existing = await ctx.loadCredentials();
  const data = {
    ...parsed.data,
    api_key: restoreApiKey(parsed.data.api_key, existing.api_key),
  };
  sendJson(res, 200, await ctx.testConnection(data));
}
