import type { TranscriptSegment } from '../../domain/types.js';

interface Json3Seg {
  utf8?: string;
}
interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Json3Seg[];
}
interface Json3Doc {
  events?: Json3Event[];
}

/**
 * Parses YouTube json3 caption content into transcript segments. Joins each
 * event's segs, normalizes whitespace, and drops empty segments. Pure; returns
 * [] on malformed input (caller decides whether empty means NO_CAPTIONS).
 */
export function parseJson3(content: string): TranscriptSegment[] {
  let doc: Json3Doc;
  try {
    doc = JSON.parse(content) as Json3Doc;
  } catch {
    return [];
  }

  const out: TranscriptSegment[] = [];
  for (const event of doc.events ?? []) {
    if (!event.segs) continue;
    const text = event.segs
      .map((s) => s.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    out.push({
      text,
      startMs: Math.max(0, Math.round(event.tStartMs ?? 0)),
      durationMs: Math.max(0, Math.round(event.dDurationMs ?? 0)),
    });
  }
  return out;
}
