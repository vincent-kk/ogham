import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../routing/routeContext.js";
import type {
  AtlassianConfig,
  Credentials,
  ConnectionTestResult,
} from "../../../../../types/index.js";
import { SetupFormDataSchema } from "../../../../../types/index.js";
import { resolveEnvironment } from "../../../../../core/index.js";
import { sendJson, describeBodyError, parseBody } from "@ogham/http-kit";

import { buildCredentials } from "../utils/buildCredentials.js";
import { restoreMaskedValues } from "../utils/restoreMaskedValues.js";

export async function handleSubmit(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let rawBody: Record<string, unknown>;
  try {
    rawBody = (await parseBody(req)) as Record<string, unknown>;
  } catch (err) {
    const { status, message } = describeBodyError(err);
    sendJson(res, status, { success: false, message });
    return;
  }
  const cloudSites = (rawBody.cloud_sites as string[] | undefined) ?? [];

  const parsed = SetupFormDataSchema.safeParse(rawBody);
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
  const existingCredentials = await ctx.loadCredentials();

  if (data.jira) restoreMaskedValues(data.jira, existingCredentials.jira);
  if (data.confluence)
    restoreMaskedValues(data.confluence, existingCredentials.confluence);

  const testResults: ConnectionTestResult[] = [];

  if (data.jira) {
    const creds = buildCredentials(data.jira, data.jira.username);
    testResults.push(
      await ctx.testConnection({
        base_url: data.jira.base_url,
        credentials: creds,
        username: data.jira.username,
        service: "jira",
        api_version_override: data.jira.api_version_override,
      }),
    );
  }

  // Cloud: Jira and Confluence share the same site URL, so the Jira connection
  // test above also represents Confluence reachability. Skip the redundant probe.
  if (data.confluence && data.deployment_type === "onprem") {
    const creds = buildCredentials(data.confluence, data.confluence.username);
    testResults.push(
      await ctx.testConnection({
        base_url: data.confluence.base_url,
        credentials: creds,
        username: data.confluence.username,
        service: "confluence",
      }),
    );
  }

  const allTestsPass = testResults.every((r) => r.success);
  if (!allTestsPass) {
    sendJson(res, 400, {
      success: false,
      message: "Connection test failed — configuration not saved",
      results: testResults,
    });
    return;
  }

  const newConfig: AtlassianConfig = {};
  const newCredentials: Credentials = {};

  if (data.deployment_type === "cloud" && data.jira) {
    const jira = data.jira;
    const urls = cloudSites.length > 0 ? cloudSites : [jira.base_url];
    const sites = urls.map((url) => {
      const env = resolveEnvironment(url);
      return {
        base_url: env.base_url,
        is_cloud: env.is_cloud,
        username: jira.username,
        ssl_verify: jira.ssl_verify ?? true,
        timeout: jira.timeout ?? 30000,
      };
    });
    newConfig.jira = sites;
    newConfig.confluence = sites;
    newCredentials.jira = buildCredentials(jira, jira.username);
    newCredentials.confluence = buildCredentials(jira, jira.username);
  } else {
    if (data.jira) {
      const env = resolveEnvironment(data.jira.base_url);
      newConfig.jira = [
        {
          base_url: env.base_url,
          is_cloud: env.is_cloud,
          username: data.jira.username,
          ssl_verify: data.jira.ssl_verify ?? true,
          timeout: data.jira.timeout ?? 30000,
          api_version_override: data.jira.api_version_override,
        },
      ];
      newCredentials.jira = buildCredentials(data.jira, data.jira.username);
    }

    if (data.confluence) {
      const env = resolveEnvironment(data.confluence.base_url);
      newConfig.confluence = [
        {
          base_url: env.base_url,
          is_cloud: env.is_cloud,
          username: data.confluence.username,
          ssl_verify: data.confluence.ssl_verify ?? true,
          timeout: data.confluence.timeout ?? 30000,
        },
      ];
      newCredentials.confluence = buildCredentials(
        data.confluence,
        data.confluence.username,
      );
    }
  }

  // The page names the layer; connection setup defaults to `user` because a
  // site and account are a person's, and only a repository that deliberately
  // points elsewhere writes the project layer.
  const scope = readScope(rawBody);
  const scopeState = await ctx.saveConfig(scope, newConfig);
  await ctx.saveCredentials(newCredentials);

  const configPath = scopeState.paths[scope];
  if (!configPath)
    throw new Error(`The ${scope} configuration scope has no writable path`);

  ctx.completeSetup(configPath);

  sendJson(res, 200, {
    success: true,
    message: "Configuration saved successfully",
    config_path: configPath,
  });

  // "Save & Close" (closeAfter) tears down the server; plain "Save" keeps it up.
  if (rawBody.closeAfter !== false) void ctx.closeServer();
}

/** The layer the page asked for, defaulting to the personal one. */
function readScope(data: unknown): "user" | "project" {
  if (typeof data !== "object" || data === null) return "user";
  return (data as { scope?: unknown }).scope === "project" ? "project" : "user";
}
