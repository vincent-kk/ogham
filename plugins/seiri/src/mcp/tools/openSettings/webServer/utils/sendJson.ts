import type { ServerResponse } from 'node:http';

import { ContentType } from '../../../../../constants/http.js';

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': ContentType.JSON,
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}
