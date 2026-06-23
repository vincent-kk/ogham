import { md } from "../markdownIt/markdownInstance.js";
import { sanitizeHtml } from "../sanitize/sanitizeHtml.js";
import {
  collectSourceLines,
  type SourceLineRange,
} from "../utils/collectSourceLines.js";

export interface RenderMeta {
  html: string;
  lineCount: number;
  sourceLineIndex: SourceLineRange[];
}

/** Render markdown to sanitized, source-line-mapped base HTML plus metadata. */
export function renderMarkdown(markdown: string): RenderMeta {
  const env: Record<string, unknown> = {};
  const tokens = md.parse(markdown, env);
  const sourceLineIndex = collectSourceLines(tokens);
  const rawHtml = md.renderer.render(tokens, md.options, env);
  const html = sanitizeHtml(rawHtml);
  const lineCount = markdown.length === 0 ? 0 : markdown.split("\n").length;
  return { html, lineCount, sourceLineIndex };
}
