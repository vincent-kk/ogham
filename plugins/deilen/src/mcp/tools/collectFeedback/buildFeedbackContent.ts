import { readFile } from "node:fs/promises";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { sessionImagePath } from "../../../constants/paths.js";
import type { StoredFeedback } from "../../../types/feedback.js";

function truncate(text: string, max = 80): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

/**
 * Render collected feedback as MCP content: a text block summarizing the overall
 * note and each line-anchored comment, followed by an image block per attachment
 * (read from disk as base64) so Claude sees the screenshots.
 */
export async function buildFeedbackContent(
  sessionId: string,
  feedback: StoredFeedback,
): Promise<CallToolResult> {
  const lines: string[] = [
    `Feedback (${feedback.comments.length} comment(s)):`,
  ];
  if (feedback.overall?.trim()) {
    lines.push(`\nOverall: ${feedback.overall.trim()}`);
  }
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
