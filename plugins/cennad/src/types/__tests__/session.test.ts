import { describe, expect, it } from 'vitest';

import { SessionMetaSchema } from '../session.js';

describe('SessionMetaSchema', () => {
  const base = {
    session_id: '00000000-0000-4000-8000-000000000000',
    provider: 'claude' as const,
    created_at: '2026-05-22T00:00:00.000Z',
    last_used_at: '2026-05-22T00:00:00.000Z',
    turn_count: 1,
    external_session_ref: 'thread-abc',
    cwd: '/Users/test/project',
    project_hash: 'abc123def456',
    model: 'opus',
    options: {},
  };

  it('parses a valid session meta', () => {
    expect(SessionMetaSchema.parse(base)).toEqual(base);
  });

  it('rejects non-uuid session_id', () => {
    expect(() =>
      SessionMetaSchema.parse({ ...base, session_id: 'x' }),
    ).toThrow();
  });

  it('rejects negative turn_count', () => {
    expect(() =>
      SessionMetaSchema.parse({ ...base, turn_count: -1 }),
    ).toThrow();
  });
});
