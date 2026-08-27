import type { FetchContext } from "../../../types/index.js";
import { attachPrefix } from "../../../utils/index.js";
import type { JiraComment } from "../operations/wire.js";
import type { RequestFn } from "./requestFn.js";
import { requestFailure } from "./requestFailure.js";
import { parseCommentPageData } from "./parseWireResponse.js";

/** One page of `GET /issue/{key}/comment`. Throws on any non-success envelope — the comment API is the fatal dependency. */
export async function fetchCommentPage(
  context: FetchContext,
  request: RequestFn,
  issueKey: string,
  startAt: number,
  maxResults: number,
  expand?: string[],
): Promise<{ comments: JiraComment[]; total: number | undefined }> {
  const endpoint = attachPrefix(
    `/issue/${encodeURIComponent(issueKey)}/comment`,
    "jira",
    context.apiVersion,
  );
  const query_params: Record<string, string> = {
    startAt: String(startAt),
    maxResults: String(maxResults),
  };
  if (expand && expand.length > 0) query_params.expand = expand.join(",");
  const response = await request(context.http, {
    method: "GET",
    endpoint,
    query_params,
  });
  if (!response.success) throw requestFailure(endpoint, response);
  const data = parseCommentPageData(response.data);
  if (data === null)
    throw new Error(`${endpoint} returned a malformed comment page`);
  return data;
}
