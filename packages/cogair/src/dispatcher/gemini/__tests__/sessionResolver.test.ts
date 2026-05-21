import { describe, expect, it } from 'vitest';

import {
  findLatestSession,
  findSessionByUuid,
  parseListSessions,
} from '../sessionResolver.js';

const SAMPLE = `
  1. Initial brainstorm (2026-01-01 12:00:00) [11111111-2222-3333-4444-555566667777]
  2. Older chat (2025-12-30 09:00:00) [aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff]
`;

describe('parseListSessions', () => {
  it('returns an empty array on empty stdout', () => {
    expect(parseListSessions('')).toEqual([]);
  });

  it('parses index / title / UUID for each session line', () => {
    const entries = parseListSessions(SAMPLE);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      index: 1,
      title: 'Initial brainstorm (2026-01-01 12:00:00)',
      sessionId: '11111111-2222-3333-4444-555566667777',
    });
    expect(entries[1].index).toBe(2);
  });

  it('ignores non-matching lines (banners, blank lines)', () => {
    const noise = ['Sessions:', '', SAMPLE.trim(), '<end>'].join('\n');
    expect(parseListSessions(noise)).toHaveLength(2);
  });
});

describe('findLatestSession', () => {
  it('returns null when the list is empty', () => {
    expect(findLatestSession([])).toBeNull();
  });

  it('returns the entry with the smallest index', () => {
    const entries = parseListSessions(SAMPLE);
    expect(findLatestSession(entries)?.index).toBe(1);
  });
});

describe('findSessionByUuid', () => {
  it('returns the entry whose UUID matches (case insensitive)', () => {
    const entries = parseListSessions(SAMPLE);
    expect(
      findSessionByUuid(entries, '11111111-2222-3333-4444-555566667777')?.index,
    ).toBe(1);
    expect(
      findSessionByUuid(entries, 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEFFFFFF')?.index,
    ).toBe(2);
  });

  it('returns null when no entry matches', () => {
    const entries = parseListSessions(SAMPLE);
    expect(
      findSessionByUuid(entries, 'deadbeef-0000-0000-0000-000000000000'),
    ).toBeNull();
  });
});
