import { FIELD_SEP } from '@/constants/ytdlp.js';

/** Realistic json3 caption document covering joins, whitespace, and cues. */
export const SAMPLE_JSON3 = JSON.stringify({
  events: [
    {
      tStartMs: 0,
      dDurationMs: 1500,
      segs: [{ utf8: 'Hello' }, { utf8: ' world' }],
    },
    {
      tStartMs: 1500,
      dDurationMs: 2000,
      segs: [{ utf8: 'this is' }, { utf8: ' a test' }],
    },
    { tStartMs: 3500, dDurationMs: 500, segs: [{ utf8: '\n' }] },
    { tStartMs: 4000, dDurationMs: 1000, segs: [{ utf8: '[Music]' }] },
  ],
});

/** A `--print` metadata line matching META_PRINT_FMT field order. */
export const SAMPLE_META = [
  'dQw4w9WgXcQ',
  'Test Title',
  'Test Channel',
  '12345',
  '212',
  '20240115',
].join(FIELD_SEP);

export const SAMPLE_VIDEO_ID = 'dQw4w9WgXcQ';
export const SAMPLE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
