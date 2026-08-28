import {
  HTML_TAG_PATTERN,
  NON_BREAKING_SPACE_ENTITY_PATTERN,
  WHITESPACE_PATTERN,
} from "./patterns.js";

/** Normalize rendered or plain comment bodies for best-effort comparisons. */
export function normalizeBody(body: string | null | undefined): string {
  return (body ?? "")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(NON_BREAKING_SPACE_ENTITY_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}
