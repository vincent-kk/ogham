/**
 * @file buildCompanionIdentityTag.ts
 * @description Compose `<companion-identity>` XML tag from identity data.
 */
import type { CompanionIdentityMinimal } from '../../../types/companionGuard.js';

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

  if (identity.personality) {
    const { tone, approach, traits } = identity.personality;
    const toneAttr = tone ? ` tone="${tone}"` : '';
    const approachAttr = approach ? ` approach="${approach}"` : '';
    const traitsText = traits?.length ? traits.join(',') : '';
    tag += `\n  <personality${toneAttr}${approachAttr}>${traitsText}</personality>`;
  }

  if (identity.principles?.length) {
    tag += `\n  <principles>${identity.principles.join(' | ')}</principles>`;
  }

  if (identity.taboos?.length) {
    tag += `\n  <taboos>${identity.taboos.join(' | ')}</taboos>`;
  }

  tag += '\n</companion-identity>';
  return tag;
}
