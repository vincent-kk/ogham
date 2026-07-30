import type { IncomingMessage, ServerResponse } from "node:http";

import { mergeConfigLayers, type ConfigScope } from "@ogham/cross-platform";

import { parseBody, sendJson } from "@ogham/http-kit";

import { ConfigSchema } from "../../../types/config.js";
import type { RouteContext } from "../routing/routeContext.js";

const MAX_CONFIG_BYTES = 64 * 1024;

interface SaveConfigBody {
  scope: ConfigScope;
  config: Record<string, unknown>;
}

/**
 * POST /api/config — validate the submitted layer and persist it.
 *
 * The body names which layer it is. A user payload is a complete document; a
 * project payload carries only the overridden keys, and dropping a key from it
 * IS the "clear override" action — which is why there is no separate route.
 *
 * Validation runs on the merged preview, never on the submitted layer alone: a
 * partial project document cannot satisfy the strict schema by itself. Nothing
 * is written unless the preview parses.
 */
export async function handleSaveConfig(
  context: RouteContext,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown;
  try {
    body = await parseBody(request, MAX_CONFIG_BYTES);
  } catch (error) {
    sendJson(response, 400, { ok: false, message: (error as Error).message });
    return;
  }

  const submitted = readSubmission(body);
  if (submitted === null) {
    sendJson(response, 400, {
      ok: false,
      message: 'Body must be { scope: "user" | "project", config: object }',
    });
    return;
  }

  const state = context.loadConfigState();
  if (submitted.scope === "project" && state.paths.project === null) {
    sendJson(response, 400, {
      ok: false,
      message: "No project root is available, so there is no project layer.",
    });
    return;
  }

  // The settings form doesn't carry last_intent (written at submit time by the
  // viewer), so keep whatever the user layer already stores.
  const document =
    submitted.scope === "user"
      ? { ...submitted.config, last_intent: state.layers.user?.last_intent }
      : submitted.config;

  const preview =
    submitted.scope === "user"
      ? mergeConfigLayers(document, state.layers.project)
      : mergeConfigLayers(state.layers.user, document);

  const parsed = ConfigSchema.safeParse(preview);
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

  try {
    sendJson(response, 200, {
      ok: true,
      state: await context.saveConfig(submitted.scope, document),
    });
  } catch (error) {
    sendJson(response, 500, { ok: false, message: (error as Error).message });
  }
}

/** Narrow an untrusted body to a submission, or null when it is not one. */
function readSubmission(body: unknown): SaveConfigBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { scope, config } = body as Record<string, unknown>;
  if (scope !== "user" && scope !== "project") return null;
  if (typeof config !== "object" || config === null || Array.isArray(config))
    return null;
  return { scope, config: config as Record<string, unknown> };
}
