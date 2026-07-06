/**
 * @file buildCompanionIdentityTag.ts
 * @description 매 턴 `<companion-identity enforcement="binding">` 태그를 조립.
 *
 * 배경정보가 아니라 이번 응답에 대한 구속 규율(binding)로 프레이밍한다. 대상은
 * `inject ∈ {turn, both}` 섹션, 본문은 `brief ?? detail`, 배치는 salience 내림차순.
 * 런타임 컷은 없다 — 500자 예산은 저작(companion_edit·setup) 게이트가 강제한다.
 */
import type { CompanionIdentityMinimal } from '../../types/companionGuard.js';

import {
  renderIdentitySection,
  selectSections,
} from './renderIdentitySection.js';

const TURN_PREAMBLE_LEAD =
  'The following are binding behavioral rules for THIS response — not background lore. Violating them breaks character.';

/**
 * 매 턴 주입 태그를 만든다. 대상 섹션이 하나도 없으면 빈 문자열을 반환해
 * 조립부(build.ts)가 규율 없는 빈 블록을 주입하지 않도록 한다.
 */
export function buildCompanionIdentityTag(
  identity: CompanionIdentityMinimal,
): string {
  const sections = selectSections(identity.sections, 'turn');
  if (sections.length === 0) return '';

  const lines: string[] = [
    '<companion-identity enforcement="binding">',
    `  You are ${identity.name}. ${TURN_PREAMBLE_LEAD}`,
  ];
  for (const section of sections)
    lines.push(`  ${renderIdentitySection(section, { useBrief: true })}`);
  lines.push('</companion-identity>');
  return lines.join('\n');
}
