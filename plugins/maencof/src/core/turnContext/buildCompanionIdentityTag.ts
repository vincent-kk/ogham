/**
 * @file buildCompanionIdentityTag.ts
 * @description Compose `<companion-identity>` XML tag from identity data.
 */
import type { CompanionIdentityMinimal } from '../../types/companionGuard.js';

/**
 * personality를 단독 태그로 직렬화한다. 객체 형식은 tone/approach 속성 +
 * traits 본문, 서술형 string은 본문 그대로. 실을 내용이 없으면 null —
 * 빈 <personality></personality>는 "성격 미정의" 오신호이므로 금지.
 */
function buildPersonalityTag(
  personality: CompanionIdentityMinimal['personality'],
): string | null {
  if (!personality) return null;
  if (typeof personality === 'string') {
    const text = personality.trim();
    return text ? `<personality>${text}</personality>` : null;
  }
  const { tone, approach, traits } = personality;
  const toneAttr = tone ? ` tone="${tone}"` : '';
  const approachAttr = approach ? ` approach="${approach}"` : '';
  const traitsText = traits?.length ? traits.join(',') : '';
  if (!toneAttr && !approachAttr && !traitsText) return null;
  return `<personality${toneAttr}${approachAttr}>${traitsText}</personality>`;
}

/**
 * Companion identity를 plain-text 선언 + 부속 속성/태그로 직렬화한다.
 * 길이 목표: ~200 chars 이하 (C1 5초 제약 준수).
 */
export function buildCompanionIdentityTag(
  identity: CompanionIdentityMinimal,
): string {
  const roleDecl = identity.role
    ? `You are ${identity.name}, a ${identity.role}.`
    : `You are ${identity.name}.`;
  let tag = `<companion-identity>\n  ${roleDecl}`;

  const personalityTag = buildPersonalityTag(identity.personality);
  if (personalityTag) tag += `\n  ${personalityTag}`;

  if (identity.principles?.length)
    tag += `\n  <principles>${identity.principles.join(' | ')}</principles>`;

  if (identity.taboos?.length)
    tag += `\n  <taboos>${identity.taboos.join(' | ')}</taboos>`;

  tag += '\n</companion-identity>';
  return tag;
}
