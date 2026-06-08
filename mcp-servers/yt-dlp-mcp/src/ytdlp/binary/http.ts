import { writeFile } from 'node:fs/promises';

import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';

const USER_AGENT = 'ogham-yt-dlp-mcp';

async function fetchOrThrow(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/octet-stream, application/json;q=0.9, */*;q=0.8',
      },
      signal,
      redirect: 'follow',
    });
  } catch (error) {
    throw new YtDlpMcpError(
      ErrorCode.NETWORK,
      `Network request failed: ${url}`,
      { cause: error },
    );
  }
  if (!res.ok) {
    const code =
      res.status === 429 ? ErrorCode.RATE_LIMITED : ErrorCode.NETWORK;
    throw new YtDlpMcpError(code, `HTTP ${res.status} fetching ${url}`);
  }
  return res;
}

export async function fetchText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetchOrThrow(url, signal);
  return res.text();
}

export async function fetchJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await fetchOrThrow(url, signal);
  return res.json();
}

/** Downloads a URL to disk. Buffers fully (assets are ~35 MB). */
export async function downloadToFile(
  url: string,
  destPath: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetchOrThrow(url, signal);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buffer);
}
