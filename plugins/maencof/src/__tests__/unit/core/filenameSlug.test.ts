/**
 * @file filenameSlug.test.ts
 * @description sanitizeSegment — 경로 구분자 flat화(Bug A) + 바이트 예산 절단(Bug B).
 */
import { describe, expect, it } from 'vitest';

import { MAX_FILENAME_SEGMENT_BYTES } from '../../../constants/filename.js';
import { sanitizeSegment } from '../../../core/filenameSlug/index.js';

describe('sanitizeSegment', () => {
  it('영문 제목을 소문자 하이픈 슬러그로 정규화한다', () => {
    expect(sanitizeSegment('Hello World')).toBe('hello-world');
  });

  it('한글은 보존하고 공백은 하이픈으로 바꾼다', () => {
    expect(sanitizeSegment('안녕 세계')).toBe('안녕-세계');
  });

  it('Bug A: "/"를 하이픈으로 치환해 디렉토리 중첩을 막는다', () => {
    const slug = sanitizeSegment('P/E 비교');
    expect(slug).toBe('p-e-비교');
    expect(slug.includes('/')).toBe(false);
  });

  it('다중 슬래시도 모두 하이픈으로 평탄화한다', () => {
    expect(sanitizeSegment('매출/아이폰/단일')).toBe('매출-아이폰-단일');
  });

  it('백슬래시도 하이픈으로 치환한다', () => {
    expect(sanitizeSegment('a\\b')).toBe('a-b');
  });

  it('경로 traversal 입력을 무력화한다 (구분자·점 제거)', () => {
    const slug = sanitizeSegment('../../etc/passwd');
    expect(slug.includes('/')).toBe(false);
    expect(slug.includes('.')).toBe(false);
    expect(slug).toBe('etc-passwd');
  });

  it('자연어 슬래시가 섞인 실제 제목도 단일 세그먼트가 된다', () => {
    const slug = sanitizeSegment(
      'Apple 실사 — 매출/아이폰 단일출처 = AI 기대베팅',
    );
    expect(slug.includes('/')).toBe(false);
    expect(slug.includes('\\')).toBe(false);
  });

  it('안전 문자가 하나도 없으면 빈 문자열을 반환한다', () => {
    expect(sanitizeSegment('!@#$%^&*()')).toBe('');
  });

  it('양끝·중복 하이픈을 정리한다', () => {
    expect(sanitizeSegment('  --hello--  ')).toBe('hello');
  });

  it('Bug B: 긴 슬러그를 바이트 예산 이내로 절단한다', () => {
    const slug = sanitizeSegment('가'.repeat(250));
    expect(Buffer.byteLength(slug, 'utf8')).toBeLessThanOrEqual(
      MAX_FILENAME_SEGMENT_BYTES,
    );
  });

  it('Bug B: 같은 입력은 항상 같은 슬러그를 만든다 (결정성)', () => {
    const long = '강세론 정량 실적 성장률 크로스체크 '.repeat(20);
    expect(sanitizeSegment(long)).toBe(sanitizeSegment(long));
  });

  it('Bug B: prefix가 같고 뒷부분만 다른 긴 입력은 해시로 구분된다', () => {
    const a = '가'.repeat(100) + '나'.repeat(150);
    const b = '가'.repeat(100) + '다'.repeat(150);
    expect(sanitizeSegment(a)).not.toBe(sanitizeSegment(b));
  });

  it('절단된 슬러그에만 hex 해시 접미사가 붙는다', () => {
    expect(sanitizeSegment('short-title')).toBe('short-title');
    expect(sanitizeSegment('가'.repeat(250))).toMatch(/-[0-9a-f]{8}$/);
  });
});
