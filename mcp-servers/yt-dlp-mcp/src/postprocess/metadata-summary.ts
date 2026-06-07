import type { VideoMetadata } from '../domain/types.js';
import { formatDuration } from './formatter.js';

/** Renders a human-readable summary of curated video metadata. */
export function formatMetadataSummary(meta: VideoMetadata): string {
  const lines = [`# ${meta.title}`, `Channel: ${meta.channel}`];
  if (meta.durationSec !== undefined) lines.push(`Duration: ${formatDuration(meta.durationSec)}`);
  if (meta.viewCount !== undefined) lines.push(`Views: ${meta.viewCount.toLocaleString('en-US')}`);
  if (meta.likeCount !== undefined) lines.push(`Likes: ${meta.likeCount.toLocaleString('en-US')}`);
  if (meta.uploadDate) lines.push(`Uploaded: ${meta.uploadDate}`);
  if (meta.isLive) lines.push('Live: yes');
  if (meta.tags && meta.tags.length > 0) lines.push(`Tags: ${meta.tags.slice(0, 5).join(', ')}`);
  if (meta.description) {
    const desc = meta.description.length > 200 ? `${meta.description.slice(0, 200)}…` : meta.description;
    lines.push(`\n${desc}`);
  }
  return lines.join('\n');
}
