import type { ServerResponse } from "node:http";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

/** Write a JSON response with the given status code and an explicit length. */
export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  // stringify returns undefined for undefined, functions and symbols — and
  // Buffer.byteLength throws on those, which would kill an error handler.
  const text = JSON.stringify(body) ?? "null";
  res.writeHead(status, {
    "Content-Type": JSON_CONTENT_TYPE,
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}
