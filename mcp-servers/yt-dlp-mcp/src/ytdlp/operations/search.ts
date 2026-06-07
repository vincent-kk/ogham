import type { SearchResult, SearchResultItem } from '../../domain/types.js';
import { asNumber, asRecordArray, asString } from '../../utils/coerce.js';
import { normalizeUploadDate } from '../../utils/normalize-date.js';

import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';

export type UploadDateFilter = 'hour' | 'today' | 'week' | 'month' | 'year';

export interface SearchParams {
  query: string;
  maxResults: number;
  offset: number;
  uploadDateFilter?: UploadDateFilter;
}

// yt-dlp --dateafter accepts day-granularity relative dates; 'hour' approximates to a day.
const DATE_AFTER: Record<UploadDateFilter, string> = {
  hour: 'now-1day',
  today: 'today',
  week: 'now-1week',
  month: 'now-1month',
  year: 'now-1year',
};

function mapItem(entry: Record<string, unknown>): SearchResultItem {
  const id = asString(entry.id) ?? '';
  return {
    id,
    title: asString(entry.title) ?? 'unknown',
    url:
      asString(entry.url) ??
      asString(entry.webpage_url) ??
      (id ? `https://www.youtube.com/watch?v=${id}` : ''),
    uploader: asString(entry.uploader) ?? asString(entry.channel),
    durationSec: asNumber(entry.duration),
    uploadDate: normalizeUploadDate(asString(entry.upload_date)),
    viewCount: asNumber(entry.view_count),
  };
}

export async function searchOperation(
  ctx: OpContext,
  params: SearchParams,
): Promise<SearchResult> {
  const fetchCount = params.offset + params.maxResults;
  const target = `ytsearch${fetchCount}:${params.query}`;
  // --dateafter only filters entries that carry upload_date, which --flat-playlist
  // omits for YouTube search entries. So when a date filter is requested we drop
  // --flat-playlist and do full extraction (slower) so the filter actually applies
  // and items carry uploadDate; otherwise stay flat (fast).
  const extraArgs = params.uploadDateFilter
    ? ['--dateafter', DATE_AFTER[params.uploadDateFilter]]
    : ['--flat-playlist'];
  const info = await fetchInfoJson(ctx, target, extraArgs);
  const all = asRecordArray(info.entries).map(mapItem);
  const items = all.slice(params.offset, params.offset + params.maxResults);
  const hasMore =
    all.length >= fetchCount && items.length === params.maxResults;
  return {
    query: params.query,
    count: items.length,
    offset: params.offset,
    hasMore,
    nextOffset: params.offset + items.length,
    items,
  };
}
