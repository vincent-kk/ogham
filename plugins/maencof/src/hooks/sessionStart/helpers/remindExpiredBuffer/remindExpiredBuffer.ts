/**
 * @file remindExpiredBuffer.ts
 * @description SessionStart remindExpiredBuffer concern — L5 buffer 문서 중 TTL(expires)이
 * 지난 것을 감지해, 세션 시작 시 정리를 촉구하는 알림을 additionalContext로 주입한다.
 *
 * **삭제하지 않는다**: L5 buffer의 만료 처리는 promote(승격) 또는 폐기(discard)라는
 * *판단*이고 폐기는 비가역이므로, 코어는 알림만 하고 실제 처리는 사용자/스킬
 * (`/maencof:organize`·`/maencof:cleanup buffer`)에 맡긴다. boundary("동의 없이 삭제 금지").
 *
 * L4 archiveExpired(이동, 가역, 자동)와 대칭: L5는 알림, 비가역 처리는 사용자.
 *
 * **Hook isolation 준수**: hook 번들에 들어가므로 Node builtin만 사용한다.
 * SessionStart concern은 동기이므로 readdirSync/readFileSync로 처리한다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { isMaencofVault } from '../../../shared/isMaencofVault.js';

/** remindExpiredBuffer concern 결과 (SessionStart additionalContext 형식) */
export interface RemindExpiredBufferResult {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: 'SessionStart';
    additionalContext: string;
  };
}

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;
const MAX_LISTED_PATHS = 5;

/**
 * L5 buffer의 만료 문서를 감지해, 있으면 정리 촉구 알림을 반환한다.
 * 아무것도 삭제하지 않는다 — 알림만.
 */
export function runRemindExpiredBuffer(
  currentWorkingDirectory: string,
): RemindExpiredBufferResult {
  if (!isMaencofVault(currentWorkingDirectory)) return { continue: true };

  const today = new Date().toISOString().slice(0, 10);
  const bufferRoot = join(currentWorkingDirectory, '05_Context', 'buffer');

  let expiredRelativePaths: string[];
  try {
    expiredRelativePaths = collectExpiredBufferDocuments(
      bufferRoot,
      currentWorkingDirectory,
      today,
    );
  } catch {
    return { continue: true }; // buffer 디렉토리 없으면 no-op
  }

  if (expiredRelativePaths.length === 0) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: buildReminderMessage(expiredRelativePaths),
    },
  };
}

/** buffer 루트를 재귀 순회하여 expires가 today보다 과거인 문서의 상대 경로를 모은다. */
function collectExpiredBufferDocuments(
  bufferRoot: string,
  currentWorkingDirectory: string,
  today: string,
): string[] {
  const expiredRelativePaths: string[] = [];
  const walkDirectory = (directory: string): void => {
    for (const directoryEntry of readdirSync(directory, {
      withFileTypes: true,
    })) {
      const entryPath = join(directory, directoryEntry.name);
      if (directoryEntry.isDirectory()) walkDirectory(entryPath);
      else if (directoryEntry.name.endsWith('.md')) {
        const expires = extractExpires(readFileSync(entryPath, 'utf-8'));
        if (expires && expires < today)
          expiredRelativePaths.push(
            entryPath
              .slice(currentWorkingDirectory.length + 1)
              .replace(/\\/g, '/'),
          );
      }
    }
  };
  walkDirectory(bufferRoot);
  return expiredRelativePaths;
}

/** frontmatter에서 expires 값만 경량 추출한다 (zod 없이). */
function extractExpires(content: string): string | undefined {
  const frontmatterMatch = FRONTMATTER_REGEX.exec(content);
  if (!frontmatterMatch) return undefined;
  for (const line of frontmatterMatch[1].split('\n')) {
    const expiresMatch = /^expires:\s*(.*)$/.exec(line.trim());
    if (expiresMatch) return expiresMatch[1].trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

/** 정리 촉구 알림 메시지를 만든다 (Claude가 사용자에게 제안하도록). */
function buildReminderMessage(expiredRelativePaths: string[]): string {
  const count = expiredRelativePaths.length;
  const listedPaths = expiredRelativePaths
    .slice(0, MAX_LISTED_PATHS)
    .map((relativePath) => `  - ${relativePath}`)
    .join('\n');
  const overflow =
    count > MAX_LISTED_PATHS
      ? `\n  … and ${count - MAX_LISTED_PATHS} more`
      : '';
  return [
    `[maencof] ${count} expired L5 buffer document(s) are past their TTL and were never triaged:`,
    `${listedPaths}${overflow}`,
    'Suggest the user promote them via /maencof:organize or discard via /maencof:cleanup buffer.',
    'Do NOT auto-delete — L5 disposal is a user decision (boundary).',
  ].join('\n');
}
