/**
 * @file buildSessionIdentityBlock.ts
 * @description 세션시작 1회용 `<companion-identity-full>` 풀 렌더.
 *
 * 매 턴 태그와 동일 골격이되 `inject ∈ {session, both}` 전량을 대상으로 하고,
 * 본문은 항상 `detail`(서사·상세규율 포함)을 사용한다. 런타임 컷은 없다.
 */
import type { CompanionIdentityV2Minimal } from '../../types/companionGuard.js';

import {
  renderIdentitySection,
  selectSections,
} from './renderIdentitySection.js';

const SESSION_PREAMBLE_LEAD =
  'The following define who you are and how you must behave for this entire session — binding rules, not background lore.';

/**
 * 세션시작 풀 identity 블록을 만든다. 대상 섹션이 없으면 빈 문자열을 반환한다.
 */
export function buildSessionIdentityBlock(
  identity: CompanionIdentityV2Minimal,
): string {
  const sections = selectSections(identity.sections, 'session');
  if (sections.length === 0) return '';

  const roleClause = identity.role ? `, whose role is: ${identity.role}` : '';
  const lines: string[] = [
    '<companion-identity-full enforcement="binding">',
    `  You are ${identity.name}${roleClause}. ${SESSION_PREAMBLE_LEAD}`,
  ];
  for (const section of sections)
    lines.push(`  ${renderIdentitySection(section, { useBrief: false })}`);
  lines.push('</companion-identity-full>');
  return lines.join('\n');
}
