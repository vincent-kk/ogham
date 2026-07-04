/**
 * @file compressMarkdown.ts
 * @description Strip YAML frontmatter and heading lines, flatten the whole body, cap at maxChars.
 */

/** 잘림 발생 시 덧붙이는 마커 — 소비자(모델)가 원문 read 필요성을 인지하는 신호. */
const TRUNCATION_MARKER = '… (truncated)';

const FRONTMATTER_RE = /^---[\s\S]*?---\n?/;
const WHITESPACE_RE = /\s/;
const TRAILING_HIGH_SURROGATE_RE = /[\uD800-\uDBFF]$/;

/**
 * frontmatter 와 heading 라인을 제거한 본문 전체를 한 줄로 평탄화해 maxChars 이내로 반환한다.
 * 초과 시 마커를 포함한 전체 길이가 maxChars 를 넘지 않도록 자른다 (surrogate pair 경계 보존).
 *
 * 단일 패스 스캔: heading skip / 공백 collapse / trim 을 한 루프에서 처리하고,
 * 잘림이 확정되는 즉시 스캔을 중단해 작업량이 문서 크기가 아니라 상한에 수렴한다.
 */
export function compressMarkdownBody(content: string, maxChars = 150): string {
  if (maxChars <= 0) return '';
  const text = content.replace(FRONTMATTER_RE, '');

  let out = '';
  let pendingSpace = false;
  let skipLine = false;
  let atLineStart = true;
  let leadingSpaces = 0;

  for (const char of text) {
    if (char === '\n') {
      skipLine = false;
      atLineStart = true;
      leadingSpaces = 0;
      pendingSpace = true;
      continue;
    }
    if (atLineStart) {
      // 마크다운은 3칸까지의 들여쓰기를 heading 으로 인정한다 (4칸부터는 코드 블록).
      if (char === ' ' && leadingSpaces < 3) {
        leadingSpaces++;
        pendingSpace = true;
        continue;
      }
      skipLine = char === '#';
      atLineStart = false;
    }
    if (skipLine) continue;
    if (WHITESPACE_RE.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && out.length > 0) out += ' ';
    pendingSpace = false;
    out += char;
    if (out.length > maxChars) break;
  }

  if (out.length <= maxChars) return out;

  // maxChars 가 마커보다 짧으면 '…' 로 강등 — 상한 계약이 마커 원문보다 우선한다.
  const marker = TRUNCATION_MARKER.length <= maxChars ? TRUNCATION_MARKER : '…';
  const budget = maxChars - marker.length;
  let cut = out.slice(0, budget);
  // slice 는 UTF-16 코드 유닛 기준 — high surrogate 에서 끊기면 한 유닛 더 물린다.
  if (TRAILING_HIGH_SURROGATE_RE.test(cut)) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}${marker}`;
}
