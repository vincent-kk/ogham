/**
 * @file renderIdentitySection.ts
 * @description Companion 정본 section을 `<{key} salience="{n}">…</{key}>` 태그로 직렬화.
 *
 * 매 턴 렌더러·세션 렌더러·예산 util이 공유하는 단일 primitive — 여기서만 마크업을
 * 정의해 측정과 렌더의 드리프트를 원천 차단한다.
 */
import type { CompanionSectionMinimal } from '../../types/companionGuard.js';

export interface RenderSectionOptions {
  /** true면 매 턴용(`brief ?? detail`), false면 세션용(항상 `detail`) */
  useBrief: boolean;
}

/**
 * 한 섹션을 명령형 태그로 렌더한다. `taboos` 섹션만 본문 앞에 `NEVER: ` 프리픽스를
 * 붙여 금지 규율을 명령형으로 강조한다(특수 처리는 taboos로 한정).
 */
export function renderIdentitySection(
  section: CompanionSectionMinimal,
  options: RenderSectionOptions,
): string {
  const body = options.useBrief
    ? (section.brief ?? section.detail)
    : section.detail;
  const content = section.key === 'taboos' ? `NEVER: ${body}` : body;
  return `<${section.key} salience="${section.salience}">${content}</${section.key}>`;
}

/**
 * 대상 채널로 주입될 섹션만 골라 salience 내림차순(동률은 원순서 유지)으로 정렬.
 */
export function selectSections(
  sections: CompanionSectionMinimal[],
  channel: 'turn' | 'session',
): CompanionSectionMinimal[] {
  const matches =
    channel === 'turn'
      ? (s: CompanionSectionMinimal) =>
          s.inject === 'turn' || s.inject === 'both'
      : (s: CompanionSectionMinimal) =>
          s.inject === 'session' || s.inject === 'both';
  return sections.filter(matches).sort((a, b) => b.salience - a.salience);
}
