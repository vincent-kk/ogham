import { describe, expect, it } from 'vitest';

import { mapVideoMetadata } from '@/ytdlp/operations/map-metadata.js';

describe('mapVideoMetadata', () => {
  it('maps standard fields from a full info-json object', () => {
    const meta = mapVideoMetadata({
      id: 'abc123',
      title: 'Test Video',
      channel: 'TestChan',
      channel_id: 'UC123',
      view_count: 1000,
      like_count: 42,
      duration: 120,
      upload_date: '20240115',
      tags: ['a', 'b'],
      is_live: false,
    });
    expect(meta.videoId).toBe('abc123');
    expect(meta.title).toBe('Test Video');
    expect(meta.channel).toBe('TestChan');
    expect(meta.channelId).toBe('UC123');
    expect(meta.viewCount).toBe(1000);
    expect(meta.likeCount).toBe(42);
    expect(meta.durationSec).toBe(120);
    expect(meta.uploadDate).toBe('2024-01-15');
    expect(meta.tags).toEqual(['a', 'b']);
    expect(meta.isLive).toBe(false);
  });

  it('falls back to uploader when channel is absent', () => {
    const meta = mapVideoMetadata({ id: 'x', uploader: 'FallbackChan' });
    expect(meta.channel).toBe('FallbackChan');
  });

  it('falls back to uploader_id when channel_id is absent', () => {
    const meta = mapVideoMetadata({ id: 'x', uploader_id: 'uid99' });
    expect(meta.channelId).toBe('uid99');
  });

  it('returns "unknown" defaults for missing required string fields', () => {
    const meta = mapVideoMetadata({});
    expect(meta.videoId).toBe('unknown');
    expect(meta.title).toBe('unknown');
    expect(meta.channel).toBe('unknown');
  });

  it('normalizes upload_date from YYYYMMDD to YYYY-MM-DD', () => {
    const meta = mapVideoMetadata({ id: 'x', upload_date: '20231231' });
    expect(meta.uploadDate).toBe('2023-12-31');
  });

  it('returns undefined uploadDate for invalid or missing date', () => {
    expect(mapVideoMetadata({ id: 'x', upload_date: 'NA' }).uploadDate).toBeUndefined();
    expect(mapVideoMetadata({ id: 'x' }).uploadDate).toBeUndefined();
  });
});
