import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { Chapter, ChapterList } from '../../domain/types.js';
import { asNumber, asRecordArray, asString } from '../../utils/coerce.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';
import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';

export interface ChaptersParams {
  url: string;
}

const secToMs = (sec: number | undefined): number | undefined =>
  sec === undefined ? undefined : Math.max(0, Math.round(sec * 1000));

export async function chaptersOperation(ctx: OpContext, params: ChaptersParams): Promise<ChapterList> {
  if (!isValidUrl(params.url)) {
    throw new YtDlpMcpError(ErrorCode.INVALID_INPUT, 'Invalid or unsupported URL');
  }
  const info = await fetchInfoJson(ctx, params.url);
  const chapters: Chapter[] = asRecordArray(info.chapters).map((c) => ({
    title: asString(c.title) ?? 'Chapter',
    startMs: secToMs(asNumber(c.start_time)) ?? 0,
    endMs: secToMs(asNumber(c.end_time)),
  }));
  return {
    videoId: asString(info.id) ?? parseVideoId(params.url) ?? 'unknown',
    chapters,
  };
}
