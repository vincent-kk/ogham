import type { FetchContext } from "../../../types/index.js";
import { attachPrefix } from "../../../utils/index.js";
import type { JiraChangelog } from "../operations/wire.js";
import type { RequestFn } from "./requestFn.js";
import { requestFailure } from "./requestFailure.js";
import { parseSearchPageData } from "./parseWireResponse.js";

/** One `GET /search` page with `expand=changelog`; throws on failure. */
export async function fetchSearchPage(
  context: FetchContext,
  request: RequestFn,
  jql: string,
  startAt: number,
  maxResults: number,
): Promise<{
  issues: Array<{ key: string; changelog?: JiraChangelog }>;
  total: number | undefined;
}> {
  const endpoint = attachPrefix("/search", "jira", context.apiVersion);
  const response = await request(context.http, {
    method: "GET",
    endpoint,
    query_params: {
      jql,
      startAt: String(startAt),
      maxResults: String(maxResults),
      fields: "summary",
      expand: "changelog",
    },
  });
  if (!response.success) throw requestFailure(endpoint, response);
  const data = parseSearchPageData(response.data);
  if (data === null)
    throw new Error(`${endpoint} returned a malformed search page`);
  return data;
}
