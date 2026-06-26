import type { IncomingMessage } from "node:http";

const MAX_BODY_BYTES = 1_000_000;

/** Read and JSON-parse a request body (bounded to guard against abuse). */
export async function parseBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).length;
    if (total > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}
