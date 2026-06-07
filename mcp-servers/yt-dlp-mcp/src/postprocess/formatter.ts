import type { TranscriptSegment } from '../domain/types.js';

/** Formats milliseconds as `H:MM:SS` (hours dropped when zero → `M:SS`). */
export function formatTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  }
  return `${m}:${ss}`;
}

/** Formats a duration given in seconds. */
export function formatDuration(totalSec: number): string {
  return formatTimestamp(Math.max(0, Math.floor(totalSec)) * 1000);
}

/** Joins transcript segments into plain text, or one timestamped line each. */
export function segmentsToText(
  segments: TranscriptSegment[],
  options?: { timestamps?: boolean },
): string {
  if (options?.timestamps) {
    return segments.map((s) => `[${formatTimestamp(s.startMs)}] ${s.text}`).join('\n');
  }
  return segments
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncates to `limit` chars, appending a notice when content was cut. */
export function truncate(text: string, limit: number, notice = '\n\n… [truncated]'): string {
  if (text.length <= limit) {
    return text;
  }
  const keep = Math.max(0, limit - notice.length);
  return text.slice(0, keep) + notice;
}
