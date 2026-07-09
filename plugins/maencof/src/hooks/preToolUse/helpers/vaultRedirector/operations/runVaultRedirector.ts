/**
 * @file runVaultRedirector.ts
 * @description PreToolUse Hook — vault 내 마크다운 파일에 대한 Read/Grep/Glob 사용 시 maencof 도구 안내
 * 차단하지 않고 additionalContext로 안내만 제공
 */
import { relative, resolve } from 'node:path';

import { normalize } from '@ogham/cross-platform/paths';

import { VAULT_REDIRECTOR_TOOL_GUIDANCE as TOOL_GUIDANCE } from '../../../../../constants/vaultRedirector.js';
import { isMaencofVault } from '../../../../shared/isMaencofVault.js';
import type {
  VaultRedirectorInput,
  VaultRedirectorResult,
} from '../types/types.js';

import { isVaultDocDirectory } from './isVaultDocDirectory.js';
import { isVaultInternalPath } from './isVaultInternalPath.js';

/**
 * vault-redirector 훅 핸들러.
 * Read/Grep/Glob 도구가 vault 내 마크다운 파일을 대상으로 할 때 maencof 도구 사용을 안내한다.
 * 항상 continue: true — 차단하지 않음.
 */
export function runVaultRedirector(
  input: VaultRedirectorInput,
): VaultRedirectorResult {
  const cwd = input.cwd ?? process.cwd();

  if (!isMaencofVault(cwd)) return { continue: true };

  const toolName = input.tool_name ?? '';

  // Glob은 pattern + path(디렉토리)를 사용하므로 별도 처리
  if (toolName === 'Glob') return handleGlobRedirect(cwd, input.tool_input);

  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? '';

  if (!filePath) return { continue: true };

  if (!isVaultInternalPath(cwd, filePath)) return { continue: true };

  const suggestion = TOOL_GUIDANCE[toolName] ?? 'maencof MCP tools';
  const relPath = normalize(relative(resolve(cwd), resolve(cwd, filePath)));

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: [
        `[maencof] Use ${suggestion} instead of ${toolName} for vault documents.`,
        `Path: ${relPath} → ${suggestion}(path: "${relPath}")`,
      ].join('\n'),
    },
  };
}

/**
 * Glob 도구 전용 리다이렉트 핸들러.
 * Glob은 pattern(glob 패턴)과 path(검색 디렉토리)를 사용한다.
 * 검색 디렉토리가 vault 내이고 패턴이 .md 파일을 대상으로 하면 안내한다.
 */
function handleGlobRedirect(
  cwd: string,
  toolInput: VaultRedirectorInput['tool_input'],
): VaultRedirectorResult {
  const pattern = (toolInput?.pattern as string | undefined) ?? '';
  const searchDir = (toolInput?.path as string | undefined) ?? cwd;

  // .md 파일을 대상으로 하지 않으면 스킵
  if (!pattern.includes('.md')) return { continue: true };

  // 검색 디렉토리가 vault 내 문서 디렉토리인지 확인
  if (!isVaultDocDirectory(cwd, searchDir)) return { continue: true };

  const suggestion = TOOL_GUIDANCE['Glob'] ?? 'maencof MCP tools';

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: [
        `[maencof] Use ${suggestion} instead of Glob for vault documents.`,
        `Pattern: ${pattern} → ${suggestion}`,
      ].join('\n'),
    },
  };
}
