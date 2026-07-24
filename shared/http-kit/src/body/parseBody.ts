import type { IncomingMessage } from "node:http";

/**
 * 1MB (1_000_000 bytes) — settings and setup forms are a few KB. Consumers
 * that accept larger payloads (deilen feedback) pass their own maxBytes.
 */
export const MAX_BODY_BYTES = 1_000_000;

export class RequestTooLargeError extends Error {
  constructor(message = "Request body too large") {
    super(message);
    this.name = "RequestTooLargeError";
  }
}

/**
 * Read and JSON-parse a request body, refusing anything over `maxBytes`.
 * The limit is checked against both the declared Content-Length and the
 * bytes actually received, since the header is caller-supplied.
 *
 * An over-cap body is never buffered past the cap, but the request is left to
 * drain rather than destroyed: destroying the socket here kills the connection
 * before the caller can write its 413, and abandoning a half-read body
 * mid-stream leaves the keep-alive connection holding unparsed bytes.
 */
export function parseBody(
  req: IncomingMessage,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      reject(new RequestTooLargeError());
      return;
    }

    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    let tooLarge = false;

    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return;
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (tooLarge) {
        reject(new RequestTooLargeError());
        return;
      }
      try {
        const [first] = chunks;
        const buffered =
          chunks.length === 1 && first ? first : Buffer.concat(chunks);
        chunks.length = 0;
        const text = buffered.toString("utf8");
        resolve(text.length === 0 ? {} : JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}
