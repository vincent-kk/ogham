/**
 * @file extract-links.test.ts
 * @description extractLinks 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import { extractLinks } from '../../../core/document-parser.js';

// ─── extractLinks ─────────────────────────────────────────────────────────────

describe('extractLinks', () => {
  it('기본 마크다운 링크를 추출한다', () => {
    const body = 'See [identity](./01_Core/identity.md) for details.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].text).toBe('identity');
    expect(links[0].href).toBe('./01_Core/identity.md');
    expect(links[0].isAbsolute).toBe(false);
  });

  it('여러 링크를 추출한다', () => {
    const body = '[A](./a.md) and [B](./b.md) and [C](./c.md)';
    const links = extractLinks(body);

    expect(links).toHaveLength(3);
    expect(links.map((l) => l.href)).toEqual(['./a.md', './b.md', './c.md']);
  });

  it('상위 경로 링크를 처리한다', () => {
    const body = 'See [parent](../01_Core/identity.md)';
    const links = extractLinks(body);

    expect(links[0].href).toBe('../01_Core/identity.md');
    expect(links[0].isAbsolute).toBe(false);
  });

  it('http 링크를 절대 경로로 분류한다', () => {
    const body = 'Visit [example](https://example.com)';
    const links = extractLinks(body);

    expect(links[0].isAbsolute).toBe(true);
  });

  it('코드 블록 내 링크를 무시한다', () => {
    const body = '```\n[link](./file.md)\n```\n\nReal [link](./real.md)';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('./real.md');
  });

  it('인라인 코드 내 링크를 무시한다', () => {
    const body = '`[fake](./fake.md)` but [real](./real.md)';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('./real.md');
  });

  it('링크 없는 문서는 빈 배열을 반환한다', () => {
    const body = 'No links here, just plain text.';
    const links = extractLinks(body);

    expect(links).toHaveLength(0);
  });

  it('앵커 링크를 절대 경로로 분류한다', () => {
    const body = '[section](#heading)';
    const links = extractLinks(body);

    expect(links[0].isAbsolute).toBe(true);
  });
});
