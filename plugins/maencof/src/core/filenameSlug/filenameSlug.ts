/**
 * @file filenameSlug.ts
 * @description 파일명 슬러그 생성 — 경로 구분자 flat화(Bug A) + UTF-8 바이트 예산 절단(Bug B).
 */
import { createHash } from 'node:crypto';

import {
  FILENAME_SLUG_HASH_LENGTH,
  MAX_FILENAME_SEGMENT_BYTES,
} from '../../constants/filename.js';

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function truncateByCodePoint(value: string, maxBytes: number): string {
  let result = '';
  for (const ch of value) {
    if (byteLength(result + ch) > maxBytes) break;
    result += ch;
  }
  return result;
}

/**
 * 정규화된 슬러그를 maxBytes 이하로 절단한다.
 *
 * 예산 내면 그대로 반환한다. 초과 시 하이픈 토큰 경계에서 자르고
 * 원본 슬러그의 짧은 해시를 접미사로 붙여 mid-token 절단·충돌·비결정성을 막는다.
 */
function truncateToByteBudget(slug: string, maxBytes: number): string {
  if (byteLength(slug) <= maxBytes) return slug;

  const hash = createHash('sha256')
    .update(slug)
    .digest('hex')
    .slice(0, FILENAME_SLUG_HASH_LENGTH);
  const budget = maxBytes - byteLength(`-${hash}`);

  let acc = '';
  for (const token of slug.split('-')) {
    const candidate = acc ? `${acc}-${token}` : token;
    if (byteLength(candidate) > budget) break;
    acc = candidate;
  }

  if (!acc) acc = truncateByCodePoint(slug, budget);
  return acc ? `${acc}-${hash}` : hash;
}

/**
 * 힌트를 안전한 단일 파일명 세그먼트로 정규화한다.
 *
 * 경로 구분자(`/`, `\`)는 하이픈으로 치환해 디렉토리 중첩을 막고(flat 보장),
 * 안전 문자만 남긴 뒤 UTF-8 바이트 예산으로 절단한다. 결과는 항상 단일 세그먼트다.
 */
export function sanitizeSegment(hint: string): string {
  const normalized = hint
    .toLowerCase()
    .replace(/[/\\]+/g, '-')
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return truncateToByteBudget(normalized, MAX_FILENAME_SEGMENT_BYTES);
}
