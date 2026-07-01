/** Parse a JSON-object body that arrived as a string (some MCP harnesses serialize object args); anything that isn't a JSON object/array passes through unchanged. */
export function normalizeBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed !== null && typeof parsed === "object" ? parsed : body;
  } catch {
    return body;
  }
}
