import type { ServerResponse } from "node:http";

/** Send a JSON response with the given status code. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}
