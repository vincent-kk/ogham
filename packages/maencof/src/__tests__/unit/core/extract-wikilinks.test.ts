/**
 * @file extract-wikilinks.test.ts
 * @description extractLinks 유닛 테스트 — 위키 스타일 링크 [[link]]
 */
import { describe, expect, it } from 'vitest';

import { extractLinks } from '../../../core/document-parser/document-parser.js';

// ─── extractLinks — 위키링크 ──────────────────────────────────────────────────

describe('extractLinks — wikilinks', () => {
  it('기본 위키링크를 추출한다', () => {
    const body = 'See [[03_External/topical/foo.md]] for details.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].text).toBe('03_External/topical/foo.md');
    expect(links[0].href).toBe('03_External/topical/foo.md');
    expect(links[0].isAbsolute).toBe(false);
  });

  it('위키링크에 .md 확장자를 자동 보정한다', () => {
    const body = 'See [[03_External/topical/foo]] here.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('03_External/topical/foo.md');
  });

  it('위키링크에서 display text를 분리한다', () => {
    const body = 'See [[03_External/topical/foo|My Alias]] here.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('03_External/topical/foo.md');
    expect(links[0].text).toBe('03_External/topical/foo|My Alias');
  });

  it('위키링크에서 heading ref를 분리한다', () => {
    const body = 'See [[03_External/topical/foo#section]] here.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('03_External/topical/foo.md');
  });

  it('위키링크에서 heading + display text를 분리한다', () => {
    const body = 'See [[path/to/note#heading|alias]] here.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('path/to/note.md');
  });

  it('여러 위키링크를 추출한다', () => {
    const body = '[[a.md]] and [[b]] and [[c.md]]';
    const links = extractLinks(body);

    expect(links).toHaveLength(3);
    expect(links.map((l) => l.href)).toEqual(['a.md', 'b.md', 'c.md']);
  });

  it('코드 블록 내 위키링크를 무시한다', () => {
    const body = '```\n[[fake.md]]\n```\n\nReal [[real.md]]';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('real.md');
  });

  it('인라인 코드 내 위키링크를 무시한다', () => {
    const body = '`[[fake.md]]` but [[real.md]]';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('real.md');
  });

  it('마크다운 링크와 위키링크를 함께 추출한다', () => {
    const body = '[standard](./path.md) and [[wiki-link]]';
    const links = extractLinks(body);

    expect(links).toHaveLength(2);
    expect(links[0].href).toBe('./path.md');
    expect(links[1].href).toBe('wiki-link.md');
  });
});
