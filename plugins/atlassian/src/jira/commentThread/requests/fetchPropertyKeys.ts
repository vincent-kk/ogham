import type { FetchContext } from "../../../types/index.js";
import { attachPrefix } from "../../../utils/index.js";
import type { RequestFn } from "./requestFn.js";

/**
 * Read the keys of every entity property on a comment for probe evidence.
 * @param context Resolved Jira transport and API version.
 * @param request Injected Jira request function.
 * @param commentId Root comment whose property keys are inspected.
 * @returns Property keys plus a warning when Jira did not return them.
 */
export async function fetchPropertyKeys(
  context: FetchContext,
  request: RequestFn,
  commentId: string,
): Promise<{ keys: string[]; warning: string | null }> {
  const endpoint = attachPrefix(
    `/comment/${encodeURIComponent(commentId)}/properties`,
    "jira",
    context.apiVersion,
  );
  const response = await request(context.http, { method: "GET", endpoint });
  if (!response.success)
    return {
      keys: [],
      warning: `comment ${commentId}: property keys unavailable (HTTP ${response.status})`,
    };
  const keys =
    (response.data as { keys?: Array<{ key?: string }> } | null)?.keys ?? [];
  return {
    keys: keys
      .map((entry) => entry.key)
      .filter((key): key is string => typeof key === "string"),
    warning: null,
  };
}
