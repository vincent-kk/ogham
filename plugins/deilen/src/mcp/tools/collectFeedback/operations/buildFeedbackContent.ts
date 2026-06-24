import { readFile } from "node:fs/promises";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { sessionImagePath } from "../../../../constants/paths.js";
import { FeedbackIntent } from "../../../../types/enums.js";
import type { StoredFeedback } from "../../../../types/feedback.js";

function truncate(text: string, max = 80): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

/** Lead directive telling Claude what the user wants done with this submission. */
function leadLine(intent: FeedbackIntent, hasItems: boolean): string {
  if (intent === FeedbackIntent.Dismiss) {
    return "The user closed the viewer without submitting feedback — no changes requested. Continue, or wait for their next message.";
  }
  if (intent === FeedbackIntent.Discuss) {
    return hasItems
      ? "The user reviewed the document and wants to CONTINUE THE CONVERSATION about the points below. Discuss or answer them in chat — do not rewrite the document unless they ask."
      : "The user reviewed the document, left no comments, and chose to continue in chat. Proceed with the conversation.";
  }
  return hasItems
    ? "The user reviewed the document and requests REVISIONS. Apply the comments below, then re-display the updated document (call render_viewer again, then collect_feedback) so they can review the next iteration."
    : "The user submitted the review with no comments — no changes requested. Continue.";
}

/**
 * Render collected feedback as MCP content: a lead directive keyed to the user's
 * intent (revise / discuss / dismiss), a text block summarizing the overall notes
 * and each line-anchored comment, then an image block per attachment (read from
 * disk as base64) so Claude sees the screenshots.
 */
export async function buildFeedbackContent(
  sessionId: string,
  feedback: StoredFeedback,
): Promise<CallToolResult> {
  const overallNotes = feedback.overall.filter((note) => note.text.trim());
  const hasItems = feedback.comments.length > 0 || overallNotes.length > 0;
  const lines: string[] = [
    leadLine(feedback.intent ?? FeedbackIntent.Revise, hasItems),
  ];

  if (overallNotes.length) {
    lines.push(`\nOverall notes (${overallNotes.length}):`);
    for (const note of overallNotes) lines.push(`- ${note.text.trim()}`);
  }
  if (feedback.comments.length) {
    lines.push(`\nComments (${feedback.comments.length}):`);
    for (const comment of feedback.comments) {
      const anchor = comment.anchor
        ? `L${comment.anchor.startLine}-${comment.anchor.endLine}`
        : "general";
      const excerpt = comment.anchor?.sourceText
        ? ` 「${truncate(comment.anchor.sourceText)}」`
        : "";
      const imgs = comment.imageIds.length
        ? ` ${comment.imageIds.map((id) => `[img_${id}]`).join(" ")}`
        : "";
      const resolved = comment.resolved ? " [resolved]" : "";
      lines.push(`- ${anchor}${excerpt}: ${comment.text}${imgs}${resolved}`);
    }
  }

  const content: CallToolResult["content"] = [
    { type: "text", text: lines.join("\n") },
  ];
  for (const image of feedback.images) {
    try {
      const data = await readFile(sessionImagePath(sessionId, image.path));
      content.push({
        type: "image",
        data: data.toString("base64"),
        mimeType: image.mimeType,
      });
    } catch {
      /* skip an unreadable attachment rather than failing the whole result */
    }
  }
  return { content };
}
