import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { MAX_COLLECT_WAIT_SECONDS } from "../../../constants/defaults.js";
import { loadConfig } from "../../../core/configManager/index.js";
import { readFeedback } from "../../../core/feedbackStore/index.js";
import { getProjectHash } from "../../../core/projectHash/index.js";
import {
  awaitFeedback,
  clearCollectedFeedback,
  getSession,
} from "../../../core/sessionStore/index.js";
import { logger } from "../../../lib/logger.js";
import type { StoredFeedback } from "../../../types/feedback.js";
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
 * the display skill can re-call.
 */
export async function handleCollectFeedback(
  input: CollectFeedbackInput,
  extra: ToolExtra,
): Promise<CallToolResult | CollectFeedbackPending> {
  const projectHash = getProjectHash(process.cwd());
  const meta = await getSession(input.session_id, projectHash);
  if (!meta) throw new Error(`unknown: no session ${input.session_id}`);

  const config = await loadConfig();
  const wait = Math.min(
    Math.max(input.wait_seconds ?? config.collect_timeout_seconds, 1),
    MAX_COLLECT_WAIT_SECONDS,
  );
  await ensureHttpServer();

  // A complete submission closes the session server-side. A closed session
  // still hands back a buffered complete that no collect has claimed yet (no
  // wait), then becomes terminal once that buffer is drained.
  const result = await awaitFeedback(
    input.session_id,
    meta.status === "closed" ? 0 : wait,
    extra.signal,
  );
  // A delivered complete is returned as MCP content with its images inlined as
  // base64, so collected feedback artifacts can be cleared while preserving the
  // closed viewer for refreshes. Best-effort — the TTL prune backstops failure.
  const deliver = async (feedback: StoredFeedback): Promise<CallToolResult> => {
    const content = await buildFeedbackContent(input.session_id, feedback);
    await clearCollectedFeedback(input.session_id).catch((err: unknown) =>
      logger.warn("collected feedback cleanup failed", {
        session_id: input.session_id,
        error: (err as Error).message,
      }),
    );
    return content;
  };

  if (result.kind === "complete") return deliver(result.feedback);
  if (result.kind === "closing") {
    throw new Error("closed: server is shutting down");
  }
  if (meta.status === "closed") {
    // The in-memory buffer is gone (server restart or closeResolver), but a
    // complete submission is durable on disk — recover it instead of failing.
    const persisted = await readFeedback(input.session_id);
    if (persisted?.status === "complete") return deliver(persisted);
    throw new Error(`closed: session ${input.session_id} is closed`);
  }
  const draft = await readFeedback(input.session_id);
  return { status: "pending", draft_count: draft?.comments.length ?? 0 };
}
