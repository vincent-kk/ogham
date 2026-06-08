import type { VideoMetadata } from '../../domain/types.js';
import { asBoolean } from '../../utils/as-boolean.js';
import { asNumber } from '../../utils/as-number.js';
import { asStringArray } from '../../utils/as-string-array.js';
import { asString } from '../../utils/as-string.js';
import { normalizeUploadDate } from '../../utils/normalize-date.js';

/** Maps a yt-dlp info-json object to the curated VideoMetadata domain type. Pure. */
export function mapVideoMetadata(info: Record<string, unknown>): VideoMetadata {
  return {
    videoId: asString(info.id) ?? 'unknown',
    title: asString(info.title) ?? 'unknown',
    channel: asString(info.channel) ?? asString(info.uploader) ?? 'unknown',
    channelId: asString(info.channel_id) ?? asString(info.uploader_id),
    viewCount: asNumber(info.view_count),
    likeCount: asNumber(info.like_count),
    commentCount: asNumber(info.comment_count),
    durationSec: asNumber(info.duration),
    uploadDate: normalizeUploadDate(asString(info.upload_date)),
    description: asString(info.description),
    tags: asStringArray(info.tags),
    categories: asStringArray(info.categories),
    thumbnailUrl: asString(info.thumbnail),
    webpageUrl: asString(info.webpage_url),
    isLive: asBoolean(info.is_live),
  };
}
