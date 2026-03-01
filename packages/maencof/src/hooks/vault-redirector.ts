/**
 * @file vault-redirector.ts
 * @description PreToolUse Hook — vault 내 마크다운 파일에 대한 Read/Grep/Glob 사용 시 maencof 도구 안내
 * 차단하지 않고 additionalContext로 안내만 제공
 */
import { resolve } from 'node:path';
import { isMaencofVault, MAENCOF_DIR, MAENCOF_META_DIR } from './shared.js';

export interface VaultRedirectorInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    path?: string;
    pattern?: string;
    [key: string]: unknown;
  };
  cwd?: string;
}

export interface VaultRedirectorResult {
  continue: true;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

const INTERNAL_DIRS = [MAENCOF_DIR, MAENCOF_META_DIR] as const;

/**
 * vault 내부 마크다운 파일인지 판별한다.
 */
export function isVaultInternalPath(cwd: string, filePath: string): boolean {
  const absPath = resolve(cwd, filePath);
  const cwdWithSep = cwd.endsWith('/') ? cwd : cwd + '/';

  if (!absPath.startsWith(cwdWithSep) && absPath !== cwd) {
    return false;
  }

  const relPath = absPath.slice(cwdWithSep.length);
  for (const dir of INTERNAL_DIRS) {
    if (relPath.startsWith(dir + '/') || relPath === dir) {
      return false;
    }
  }

  if (!absPath.endsWith('.md')) {
    return false;
  }

  return true;
}

// 도구별 안내 메시지 매핑
const TOOL_GUIDANCE: Record<string, string> = {
  Read: 'maencof_read',
  Grep: 'kg_search',
  Glob: 'kg_search or kg_navigate',
};

/**
 * vault 루트 또는 문서 디렉토리인지 판별한다 (내부 관리 디렉토리 제외).
 * Glob의 path (검색 디렉토리) 검사에 사용된다.
 */
export function isVaultDocDirectory(cwd: string, dirPath: string): boolean {
  const absPath = resolve(cwd, dirPath);
  const cwdWithSep = cwd.endsWith('/') ? cwd : cwd + '/';

  // vault 루트이거나 하위 디렉토리여야 함
  if (absPath !== cwd && !absPath.startsWith(cwdWithSep)) {
    return false;
  }

  // 내부 관리 디렉토리 제외
  if (absPath !== cwd) {
    const relPath = absPath.slice(cwdWithSep.length);
    for (const dir of INTERNAL_DIRS) {
      if (relPath.startsWith(dir + '/') || relPath === dir) {
        return false;
      }
    }
  }

  return true;
}

/**
 * vault-redirector 훅 핸들러.
 * Read/Grep/Glob 도구가 vault 내 마크다운 파일을 대상으로 할 때 maencof 도구 사용을 안내한다.
 * 항상 continue: true — 차단하지 않음.
 */
export function runVaultRedirector(input: VaultRedirectorInput): VaultRedirectorResult {
  const cwd = input.cwd ?? process.cwd();

  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  const toolName = input.tool_name ?? '';

  // Glob은 pattern + path(디렉토리)를 사용하므로 별도 처리
  if (toolName === 'Glob') {
    return handleGlobRedirect(cwd, input.tool_input);
  }

  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? '';

  if (!filePath) {
    return { continue: true };
  }

  if (!isVaultInternalPath(cwd, filePath)) {
    return { continue: true };
  }

  const suggestion = TOOL_GUIDANCE[toolName] ?? 'maencof MCP tools';
  const cwdWithSep = cwd.endsWith('/') ? cwd : cwd + '/';
  const relPath = resolve(cwd, filePath).slice(cwdWithSep.length);

  return {
    continue: true,
    hookSpecificOutput: {
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
  if (!pattern.includes('.md')) {
    return { continue: true };
  }

  // 검색 디렉토리가 vault 내 문서 디렉토리인지 확인
  if (!isVaultDocDirectory(cwd, searchDir)) {
    return { continue: true };
  }

  const suggestion = TOOL_GUIDANCE['Glob'] ?? 'maencof MCP tools';

  return {
    continue: true,
    hookSpecificOutput: {
      additionalContext: [
        `[maencof] Use ${suggestion} instead of Glob for vault documents.`,
        `Pattern: ${pattern} → ${suggestion}`,
      ].join('\n'),
    },
  };
}
