/**
 * @file dailynote-writer.ts
 * @description Dailynote 생성/추가/파싱 유틸리티
 *
 * claude-md-merger.ts와 동급의 파일시스템 I/O 예외 모듈.
 * hooks, session-start, session-end, MCP 도구(dailynote_read) 등 여러 소비자에서 재사용.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import type { DailynoteCategory, DailynoteEntry } from '../types/dailynote.js';
import { TOOL_CATEGORY_MAP } from '../types/dailynote.js';

/** dailynotes 디렉토리명 */
const DAILYNOTES_DIR = 'dailynotes';

/**
 * dailynotes 디렉토리 경로를 반환한다.
 */
export function getDailynoteDir(cwd: string): string {
  return join(cwd, '.maencof-meta', DAILYNOTES_DIR);
}

/**
 * 특정 날짜의 dailynote 파일 경로를 반환한다.
 * @param date - YYYY-MM-DD 형식 (미지정 시 오늘)
 */
export function getDailynotePath(cwd: string, date?: string): string {
  const d = date ?? formatDate(new Date());
  return join(getDailynoteDir(cwd), `${d}.md`);
}

/**
 * DailynoteEntry를 마크다운 라인으로 포맷한다.
 *
 * 형식: `- **[HH:MM]** \`category\` description → path`
 */
export function formatDailynoteEntry(entry: DailynoteEntry): string {
  const pathSuffix = entry.path ? ` → ${entry.path}` : '';
  return `- **[${entry.time}]** \`${entry.category}\` ${entry.description}${pathSuffix}`;
}

/**
 * dailynote 파일에 엔트리를 추가한다.
 * 파일이 없으면 헤더와 함께 새로 생성한다.
 */
export function appendDailynoteEntry(
  cwd: string,
  entry: DailynoteEntry,
): void {
  const filePath = getDailynotePath(cwd);
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  const line = formatDailynoteEntry(entry);

  if (!existsSync(filePath)) {
    const date = formatDate(new Date());
    const header = `# Dailynote — ${date}\n\n## Activity Log\n\n`;
    writeFileSync(filePath, header + line + '\n', 'utf-8');
  } else {
    appendFileSync(filePath, line + '\n', 'utf-8');
  }
}

/**
 * 마크다운 dailynote 파일 내용을 파싱하여 DailynoteEntry 배열로 반환한다.
 */
export function parseDailynote(content: string): DailynoteEntry[] {
  const entries: DailynoteEntry[] = [];
  const lines = content.split('\n');

  // 패턴: - **[HH:MM]** `category` description → path
  const pattern =
    /^- \*\*\[(\d{2}:\d{2})\]\*\* `([^`]+)` (.+?)(?:\s→\s(.+))?$/;

  for (const line of lines) {
    const match = pattern.exec(line.trim());
    if (match) {
      const entry: DailynoteEntry = {
        time: match[1],
        category: match[2] as DailynoteCategory,
        description: match[3],
      };
      if (match[4]) {
        entry.path = match[4];
      }
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * MCP 도구명 + 입력에서 사람이 읽기 좋은 설명을 생성한다.
 */
export function buildToolDescription(
  toolName: string,
  toolInput: Record<string, unknown>,
): string {
  const category = TOOL_CATEGORY_MAP[toolName];

  switch (toolName) {
    case 'maencof_create': {
      const layer = toolInput['layer'] ?? '?';
      const tags = Array.isArray(toolInput['tags'])
        ? (toolInput['tags'] as string[]).join(', ')
        : '';
      return `문서 생성 (L${layer}${tags ? `, tags: ${tags}` : ''})`;
    }
    case 'maencof_update':
      return '문서 수정';
    case 'maencof_delete':
      return '문서 삭제';
    case 'maencof_move': {
      const target = toolInput['target_layer'] ?? '?';
      return `문서 이동 (→ L${target})`;
    }
    case 'claudemd_merge':
      return 'CLAUDE.md 지시문 병합';
    case 'claudemd_remove':
      return 'CLAUDE.md 지시문 제거';
    case 'claudemd_read':
      return 'CLAUDE.md 지시문 읽기';
    case 'kg_search': {
      const seed = Array.isArray(toolInput['seed'])
        ? (toolInput['seed'] as string[]).join(', ')
        : '';
      return `KG 검색 (seed: ${seed})`;
    }
    case 'kg_navigate':
      return 'KG 탐색';
    case 'kg_context':
      return '문맥 조립';
    case 'kg_build':
      return toolInput['force'] ? '인덱스 전체 재빌드' : '인덱스 증분 빌드';
    case 'kg_status':
      return 'Vault 상태 조회';
    case 'kg_suggest_links':
      return '링크 추천';
    default:
      return category ? `${category} 작업` : toolName;
  }
}

/**
 * 현재 시각을 HH:MM 형식으로 반환한다.
 */
export function formatTime(date: Date): string {
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${HH}:${mm}`;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 반환한다.
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
