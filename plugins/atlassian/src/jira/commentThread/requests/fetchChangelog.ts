import type { FetchContext } from "../../../types/index.js";
import { attachPrefix } from "../../../utils/index.js";
import type { JiraChangelog } from "../operations/wire.js";
import type { RequestFn } from "./requestFn.js";
import { parseChangelogEnvelope } from "./parseWireResponse.js";

/** `issue.changelog` via `expand=changelog`; `null` plus a warning when the request failed or the expand was ignored. */
export async function fetchChangelog(
  context: FetchContext,
  request: RequestFn,
  issueKey: string,
): Promise<{ changelog: JiraChangelog | null; warning: string | null }> {
  const endpoint = attachPrefix(
    `/issue/${encodeURIComponent(issueKey)}`,
    "jira",
    context.apiVersion,
  );
  const response = await request(context.http, {
    method: "GET",
    endpoint,
    query_params: { expand: "changelog", fields: "summary" },
  });
  if (!response.success)
    return {
      changelog: null,
      warning: `changelog unavailable (HTTP ${response.status}); replies not recovered`,
    };
  const parsed = parseChangelogEnvelope(response.data);
  if (parsed.kind === "missing")
    return {
      changelog: null,
      warning: "changelog expand ignored by the server; replies not recovered",
    };
  if (parsed.kind === "malformed")
    return {
      changelog: null,
      warning:
        "malformed changelog returned by the server; replies not recovered",
    };
  return { changelog: parsed.changelog, warning: null };
}
