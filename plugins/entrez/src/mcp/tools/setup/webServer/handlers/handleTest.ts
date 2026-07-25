import type { IncomingMessage, ServerResponse } from "node:http";

import { describeBodyError, parseBody } from "@ogham/http-kit/body";
import { sendJson } from "@ogham/http-kit/response";

import type { RouteContext } from "../routing/routeContext.js";
import { SetupFormDataSchema } from "../../../../../types/setup.js";
import { restoreApiKey } from "../utils/maskApiKey.js";

/** POST /test — EInfo reachability probe (does not save). */
export async function handleTest(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch (err) {
    const { status, message } = describeBodyError(err);
    sendJson(res, status, { success: false, message });
    return;
  }
  const parsed = SetupFormDataSchema.safeParse(raw);
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
  const data = {
    ...parsed.data,
    api_key: restoreApiKey(parsed.data.api_key, existing.api_key),
  };
  sendJson(res, 200, await ctx.testConnection(data));
}
