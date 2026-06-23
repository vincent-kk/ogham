import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { MAX_COLLECT_WAIT_SECONDS } from "../../../constants/defaults.js";
import { loadConfig } from "../../../core/configManager/index.js";
import { readFeedback } from "../../../core/feedbackStore/index.js";
import { getProjectHash } from "../../../core/projectHash/index.js";
import { awaitFeedback, getSession } from "../../../core/sessionStore/index.js";
import { ensureHttpServer } from "../../httpServer/index.js";
import type { ToolExtra } from "../../shared/index.js";

import { buildFeedbackContent } from "./operations/buildFeedbackContent.js";

export interface CollectFeedbackInput {
  session_id: string;
  wait_seconds?: number;
}

export interface CollectFeedbackPending {
  status: "pending";
  draft_count: number;
}

/**
 * collect_feedback: bounded long-poll. Returns the submitted feedback as MCP
 * content once a complete submission arrives, or a pending marker on timeout so
 * the present skill can re-call.
 */
export async function handleCollectFeedback(
  input: CollectFeedbackInput,
  extra: ToolExtra,
): Promise<CallToolResult | CollectFeedbackPending> {
  const projectHash = getProjectHash(process.cwd());
  const meta = await getSession(input.session_id, projectHash);
  if (!meta) throw new Error(`unknown: no session ${input.session_id}`);
  if (meta.status === "closed") {
    throw new Error(`closed: session ${input.session_id} is closed`);
  }

  const config = await loadConfig();
  const wait = Math.min(
    Math.max(input.wait_seconds ?? config.collect_timeout_seconds, 1),
    MAX_COLLECT_WAIT_SECONDS,
  );
  await ensureHttpServer();

  const result = await awaitFeedback(input.session_id, wait, extra.signal);
  if (result.kind === "complete") {
    return buildFeedbackContent(input.session_id, result.feedback);
  }
  if (result.kind === "closing") {
    throw new Error("closed: server is shutting down");
  }
  const draft = await readFeedback(input.session_id);
  return { status: "pending", draft_count: draft?.comments.length ?? 0 };
}
