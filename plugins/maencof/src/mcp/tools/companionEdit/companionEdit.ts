/**
 * @file companionEdit.ts
 * @description companion_edit 도구 핸들러 — companion-identity.json 정본 편집.
 * 로직은 core/companionEdit에 위임한다(도구는 얇게 유지).
 */
import { applyCompanionEdit } from '../../../core/companionEdit/index.js';
import type {
  CompanionEditInput,
  CompanionEditResult,
} from '../../../types/mcpCompanion.js';

/**
 * companion_edit 핸들러.
 *
 * @param vaultPath - vault 절대 경로
 * @param input - 편집 입력(operation + preview/commit)
 */
export function handleCompanionEdit(
  vaultPath: string,
  input: CompanionEditInput,
): CompanionEditResult {
  return applyCompanionEdit(vaultPath, input);
}
