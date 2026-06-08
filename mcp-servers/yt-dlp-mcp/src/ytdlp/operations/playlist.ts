import { ErrorCode, YtDlpMcpError } from '@/domain/errors.js';
import type { PlaylistEntry, PlaylistResult } from '@/domain/types.js';
import { asNumber } from '@/utils/as-number.js';
import { asRecordArray } from '@/utils/as-record-array.js';
import { asString } from '@/utils/as-string.js';
import { isValidUrl } from '@/utils/validate-url.js';

import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';

export interface PlaylistParams {
  url: string;
  limit?: number;
}

function mapEntry(entry: Record<string, unknown>): PlaylistEntry {
  const id = asString(entry.id) ?? '';
  const url =
    asString(entry.url) ??
    asString(entry.webpage_url) ??
    (id ? `https://www.youtube.com/watch?v=${id}` : '');
  return {
    id,
    title: asString(entry.title) ?? 'unknown',
    url,
    uploader: asString(entry.uploader) ?? asString(entry.channel),
    durationSec: asNumber(entry.duration),
  };
}

export async function playlistOperation(
  ctx: OpContext,
  params: PlaylistParams,
): Promise<PlaylistResult> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  const extraArgs = ['--flat-playlist'];
  if (params.limit && params.limit > 0)
    extraArgs.push('--playlist-end', String(params.limit));
  const info = await fetchInfoJson(ctx, params.url, extraArgs);
  const entries = asRecordArray(info.entries).map(mapEntry);
  return {
    id: asString(info.id),
    title: asString(info.title),
    uploader: asString(info.uploader) ?? asString(info.channel),
    count: entries.length,
    entries,
  };
}
