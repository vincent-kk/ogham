import { FIELD_SEP } from '@/constants/ytdlp.js';
import type { VideoMetadata } from '@/domain/types.js';
import { lastNonEmptyLine } from '@/utils/last-line.js';
import { normalizeUploadDate } from '@/utils/normalize-date.js';
import { parseVideoId } from '@/utils/parse-video-id.js';

function toInt(value: string | undefined): number | undefined {
  if (!value || value === 'NA') return undefined;

  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Parses the FIELD_SEP-delimited `--print META_PRINT_FMT` line into VideoMetadata. */
export function parseMetaPrint(stdout: string, url: string): VideoMetadata {
  const [id, title, channel, viewCount, duration, uploadDate] =
    lastNonEmptyLine(stdout).split(FIELD_SEP);
  return {
    videoId: (id ?? '').trim() || parseVideoId(url) || 'unknown',
    title: (title ?? '').trim() || 'unknown',
    channel: (channel ?? '').trim() || 'unknown',
    viewCount: toInt(viewCount),
    durationSec: toInt(duration),
    uploadDate: normalizeUploadDate(uploadDate),
  };
}
