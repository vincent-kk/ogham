/**
 * @file classifyL3Document.ts
 * @description L3 문서를 서브레이어로 분류한다.
 */
import {
  ORG_TAGS,
  PERSON_TAGS,
} from '../../../constants/architectureMigrator.js';
import type { L3SubLayer } from '../../../types/common.js';

/**
 * L3 문서를 서브레이어로 분류한다.
 *
 * 분류 우선순위:
 * 1. person / person_ref 필드 → relational
 * 2. org_type 필드 → structural
 * 3. 태그 휴리스틱 (PERSON_TAGS → relational, ORG_TAGS → structural)
 * 4. 기본값 → topical
 */
export function classifyL3Document(
  fm: Record<string, unknown>,
  tags: string[],
): L3SubLayer {
  // Rule 1: person object or person_ref present
  if (fm.person || fm.person_ref) return 'relational';

  // Rule 2: org_type present
  if (fm.org_type) return 'structural';

  // Rule 3: tag heuristics
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => PERSON_TAGS.has(t))) return 'relational';
  if (lowerTags.some((t) => ORG_TAGS.has(t))) return 'structural';

  // Default
  return 'topical';
}
