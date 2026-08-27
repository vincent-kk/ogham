import type { FetchContext } from "../../../types/index.js";
import { attachPrefix } from "../../../utils/index.js";
import type { RequestFn } from "./requestFn.js";

/** Whether `GET /issue/{key}/changelog` exists on this deployment — recorded as evidence, not used by `read` in schema v1. */
export async function probeChangelogEndpoint(
  context: FetchContext,
  request: RequestFn,
  issueKey: string,
): Promise<"available" | "unavailable" | "unknown"> {
  const endpoint = attachPrefix(
    `/issue/${encodeURIComponent(issueKey)}/changelog`,
    "jira",
    context.apiVersion,
  );
  const response = await request(context.http, {
    method: "GET",
    endpoint,
    query_params: { maxResults: "1" },
  });
  if (response.success) return "available";
  return response.status === 404 ? "unavailable" : "unknown";
}
