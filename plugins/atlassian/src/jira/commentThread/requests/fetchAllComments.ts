import type { FetchContext } from "../../../types/index.js";
import type { JiraComment } from "../operations/wire.js";
import { fetchCommentPage } from "./fetchCommentPage.js";
import { MAX_COMMENTS, PAGE_SIZE } from "./limits.js";
import type { RequestFn } from "./requestFn.js";

/**
 * Read an issue's comments in bounded pages.
 * @param context Resolved Jira transport and API version.
 * @param request Injected Jira request function.
 * @param issueKey Validated issue key.
 * @param expand Optional comment expansions forwarded to every page.
 * @returns Collected comments, whether the set is complete, and an explanatory warning when it is not.
 */
export async function fetchAllComments(
  context: FetchContext,
  request: RequestFn,
  issueKey: string,
  expand?: string[],
): Promise<{
  comments: JiraComment[];
  complete: boolean;
  warning: string | null;
}> {
  const comments: JiraComment[] = [];
  let startAt = 0;
  while (comments.length < MAX_COMMENTS) {
    const remaining = MAX_COMMENTS - comments.length;
    const page = await fetchCommentPage(
      context,
      request,
      issueKey,
      startAt,
      Math.min(PAGE_SIZE, remaining),
      expand,
    );
    const returned = page.comments.length;
    comments.push(...page.comments.slice(0, remaining));
    if (page.comments.length === 0)
      return page.total === undefined || startAt >= page.total
        ? { comments, complete: true, warning: null }
        : {
            comments,
            complete: false,
            warning: `comment paging stopped at ${startAt} before reported total ${page.total}`,
          };
    const nextStartAt = startAt + returned;
    if (page.total !== undefined && nextStartAt >= page.total)
      return { comments, complete: true, warning: null };
    if (comments.length >= MAX_COMMENTS)
      return {
        comments,
        complete: false,
        warning: `comment cap of ${MAX_COMMENTS} reached; later comments not returned`,
      };
    startAt = nextStartAt;
  }
  return {
    comments,
    complete: false,
    warning: `comment cap of ${MAX_COMMENTS} reached; later comments not returned`,
  };
}
