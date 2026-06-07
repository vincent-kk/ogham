import type { TranscriptSegment } from '../domain/types.js';

// Non-speech caption cues like [Music], [Applause]. Conservative on purpose.
const BRACKET_CUE =
  /\[(?:music|applause|laughter|cheering|sighs?|gasps?|silence|inaudible)\]/gi;

/** Removes bracketed non-speech cues and normalizes whitespace. */
export function stripCaptionArtifacts(text: string): string {
  return text.replace(BRACKET_CUE, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Drops consecutive segments with identical text — a common rolling-caption
 * artifact in auto-generated subtitles.
 */
export function dedupeAdjacent(
  segments: TranscriptSegment[],
): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  let prev = '';
  for (const seg of segments) {
    const norm = seg.text.trim();
    if (norm && norm !== prev) {
      out.push(seg);
      prev = norm;
    }
  }
  return out;
}
