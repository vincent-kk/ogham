import type { ImageRewrite } from "../markdownIt/imageRule.js";
import { markdownIt } from "../markdownIt/markdownInstance.js";
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

export interface RenderMarkdownOptions {
  imageRewrite?: ImageRewrite;
}

function countLines(markdown: string): number {
  if (markdown.length === 0) return 0;
  let lineCount = 1;
  let position = markdown.indexOf("\n");
  while (position !== -1) {
    lineCount += 1;
    position = markdown.indexOf("\n", position + 1);
  }
  return lineCount;
}

/** Render markdown to sanitized, source-line-mapped base HTML plus metadata. */
export function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {},
): RenderMeta {
  const env: Record<string, unknown> = {};
  if (options.imageRewrite) env.imageRewrite = options.imageRewrite;
  const tokens = markdownIt.parse(markdown, env);
  const sourceLineIndex = collectSourceLines(tokens);
  const rawHtml = markdownIt.renderer.render(tokens, markdownIt.options, env);
  const html = sanitizeHtml(rawHtml);
  return { html, lineCount: countLines(markdown), sourceLineIndex };
}
