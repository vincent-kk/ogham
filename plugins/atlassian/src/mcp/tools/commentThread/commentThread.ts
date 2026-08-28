import {
  probeCommentThread,
  readCommentThread,
  saveCommentThreadProfile,
  scanCommentThreads,
} from "../../../jira/index.js";
import type { FetchContext, CommentThreadInput } from "../../../types/index.js";

/** Tool arguments after zod validation in `server.ts`; `mode` defaults to `read`. */
export type CommentThreadArgs = CommentThreadInput;

/**
 * Dispatch one `comment_thread` call to the recipe that owns the mode.
 * @param args Validated mode-specific arguments from the MCP server.
 * @param ctx Resolved Jira site context.
 * @returns The selected recipe's result unchanged.
 * @throws On Cloud sites or when the selected mode lacks a required argument.
 */
export async function handleCommentThread(
  args: CommentThreadArgs,
  ctx: FetchContext,
): Promise<unknown> {
  if (ctx.is_cloud === true)
    throw new Error(
      "comment_thread supports Server/Data Center sites only; use fetch GET /issue/{key}/comment on Cloud.",
    );
  switch (args.mode) {
    case undefined:
    case "read":
      return readCommentThread(ctx, {
        issue_key: required(args.issue_key, "issue_key"),
        start_at: args.start_at,
        max_results: args.max_results,
        expand: args.expand,
      });
    case "scan":
      return scanCommentThreads(ctx, {
        jql: required(args.jql, "jql"),
        max_issues: args.max_issues,
      });
    case "probe":
      return probeCommentThread(ctx, {
        sample_issue_key: required(args.sample_issue_key, "sample_issue_key"),
      });
    case "save_profile":
      return saveCommentThreadProfile(ctx, {
        profile: required(args.profile, "profile"),
        proposal_digest: args.proposal_digest,
      });
  }
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`${name} is required for this mode`);
  return value;
}
