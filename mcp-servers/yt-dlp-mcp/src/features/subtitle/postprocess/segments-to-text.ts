import type { TranscriptSegment } from '../../../domain/types.js';
import { formatTimestamp } from '../../../postprocess/format-timestamp.js';

/** Joins transcript segments into plain text, or one timestamped line each. */
export function segmentsToText(
  segments: TranscriptSegment[],
  options?: { timestamps?: boolean },
): string {
  if (options?.timestamps)
    return segments
      .map((s) => `[${formatTimestamp(s.startMs)}] ${s.text}`)
      .join('\n');
  return segments
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
