import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(
  __dirname,
  '..',
  '..',
  'scripts',
  'test-helpers',
  'fixtures',
  'gh',
  'digest-collision-2markers.json'
);

const DIGEST_MARKER = '<!-- imbas:digest -->';

interface DigestComment {
  id: string;
  body: string;
  createdAt: string;
  author: { login: string };
}

function resolveDigest(
  comments: DigestComment[]
): DigestComment | undefined {
  const marked = comments.filter((c) => c.body.includes(DIGEST_MARKER));
  if (marked.length === 0) return undefined;
  return marked.reduce((latest, c) =>
    new Date(c.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ? c
      : latest
  );
}

describe('github-digest-collision — last-wins across 2-marker fixture', () => {
  it('returns the later comment when two digest markers exist', () => {
    const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as {
      number: number;
      comments: DigestComment[];
    };

    expect(fixture.comments).toHaveLength(2);

    const resolved = resolveDigest(fixture.comments);

    expect(resolved).toBeDefined();
    expect(resolved!.id).toBe('IC_second');
    expect(resolved!.createdAt).toBe('2026-04-05T09:00:00Z');
    expect(resolved!.body).toContain('in-progress 전환');
  });

  it('returns undefined when no digest marker exists', () => {
    const noMarkerComments: DigestComment[] = [
      {
        id: 'IC_plain',
        body: 'Just a regular comment.',
        createdAt: '2026-04-04T10:00:00Z',
        author: { login: 'user' },
      },
    ];
    expect(resolveDigest(noMarkerComments)).toBeUndefined();
  });

  it('returns the only comment when exactly one marker exists', () => {
    const oneMarkerComments: DigestComment[] = [
      {
        id: 'IC_only',
        body: `${DIGEST_MARKER}\n\n## Digest\n\n**2026-04-04** — init`,
        createdAt: '2026-04-04T10:00:00Z',
        author: { login: 'imbas-bot' },
      },
    ];
    const resolved = resolveDigest(oneMarkerComments);
    expect(resolved).toBeDefined();
    expect(resolved!.id).toBe('IC_only');
  });
});
