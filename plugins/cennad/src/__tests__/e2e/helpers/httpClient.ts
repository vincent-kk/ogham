import { Buffer } from 'node:buffer';
import { type IncomingHttpHeaders, request } from 'node:http';

export interface HttpResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

function performRequest(
  method: 'GET' | 'POST',
  url: string,
  body?: string,
  contentType?: string,
): Promise<HttpResponse> {
  return new Promise((resolveResponse, reject) => {
    const parsed = new URL(url);
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Length'] = String(Buffer.byteLength(body));
      if (contentType) headers['Content-Type'] = contentType;
    }
    const req = request(
      {
        method,
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 80,
        path: `${parsed.pathname}${parsed.search}`,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          resolveResponse({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

export function httpGet(url: string): Promise<HttpResponse> {
  return performRequest('GET', url);
}

export function httpPostJson(
  url: string,
  body: unknown,
  contentType = 'application/json',
): Promise<HttpResponse> {
  return performRequest('POST', url, JSON.stringify(body), contentType);
}

export function httpPostRaw(
  url: string,
  body: string,
  contentType: string,
): Promise<HttpResponse> {
  return performRequest('POST', url, body, contentType);
}
