import type { IncomingMessage } from 'node:http';

const MAX_BODY_BYTES = 1_000_000; // 1MB

export class RequestTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'RequestTooLargeError';
  }
}

export function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      reject(new RequestTooLargeError());
      return;
    }

    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return;
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(new RequestTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text.length === 0 ? {} : JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
