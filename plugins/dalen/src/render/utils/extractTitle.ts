import type Token from "markdown-it/lib/token.mjs";

/** Return the text of the first H1, or "" when the document has none. */
export function extractTitle(tokens: Token[]): string {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "heading_open" && token.tag === "h1") {
      const inline = tokens[i + 1];
      return inline && inline.type === "inline" ? inline.content.trim() : "";
    }
  }
  return "";
}
