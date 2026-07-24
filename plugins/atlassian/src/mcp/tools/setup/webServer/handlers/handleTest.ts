import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../routeContext.js";
import type { ConnectionTestResult } from "../../../../../types/index.js";
import { SetupFormDataSchema } from "../../../../../types/index.js";
import { sendJson } from "@ogham/http-kit/response";
import { describeBodyError, parseBody } from "@ogham/http-kit/body";
import { buildCredentials } from "../utils/buildCredentials.js";

export async function handleTest(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await parseBody(req);
  } catch (err) {
    const { status, message } = describeBodyError(err);
    sendJson(res, status, { success: false, message });
    return;
  }
  const parsed = SetupFormDataSchema.safeParse(body);
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

  const data = parsed.data;
  const results: ConnectionTestResult[] = [];

  if (data.jira) {
    const creds = buildCredentials(data.jira, data.jira.username);
    results.push(
      await ctx.testConnection({
        base_url: data.jira.base_url,
        credentials: creds,
        username: data.jira.username,
        service: "jira",
        api_version_override: data.jira.api_version_override,
      }),
    );
  }

  if (data.confluence) {
    const creds = buildCredentials(data.confluence, data.confluence.username);
    results.push(
      await ctx.testConnection({
        base_url: data.confluence.base_url,
        credentials: creds,
        username: data.confluence.username,
        service: "confluence",
      }),
    );
  }

  const allSuccess = results.every((r) => r.success);
  sendJson(res, 200, {
    success: allSuccess,
    message: allSuccess
      ? "All connections successful"
      : "Some connections failed",
    results,
  });
}
