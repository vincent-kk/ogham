import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type {
  SubtitleLanguageList,
  SubtitleTrack,
} from '../../domain/types.js';
import { asRecordArray } from '../../utils/as-record-array.js';
import { asRecord } from '../../utils/as-record.js';
import { asString } from '../../utils/as-string.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';

import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';

export interface ListSubtitlesParams {
  url: string;
}

function toTracks(
  group: Record<string, unknown> | undefined,
  isAutomatic: boolean,
): SubtitleTrack[] {
  if (!group) return [];
  const tracks: SubtitleTrack[] = [];
  for (const [language, value] of Object.entries(group)) {
    const variants = asRecordArray(value);
    const ext =
      variants
        .map((v) => asString(v.ext))
        .find((e): e is string => Boolean(e)) ?? 'vtt';
    const name = variants
      .map((v) => asString(v.name))
      .find((n): n is string => Boolean(n));
    tracks.push({ language, ext, isAutomatic, name });
  }
  return tracks;
}

export async function listSubtitlesOperation(
  ctx: OpContext,
  params: ListSubtitlesParams,
): Promise<SubtitleLanguageList> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  const info = await fetchInfoJson(ctx, params.url);
  return {
    videoId: asString(info.id) ?? parseVideoId(params.url) ?? 'unknown',
    manual: toTracks(asRecord(info.subtitles), false),
    automatic: toTracks(asRecord(info.automatic_captions), true),
  };
}
