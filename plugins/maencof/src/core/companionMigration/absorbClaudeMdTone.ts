/**
 * @file absorbClaudeMdTone.ts
 * @description CLAUDE.md의 "떠도는" Communication Style / Tone 섹션을 v2 section으로
 * 흡수하기 위한 scan(읽기)과 remove(쓰기)를 분리 제공한다.
 *
 * scan은 부작용 없이 section을 산출하고, remove는 백업 후 원본에서 섹션을 제거한다.
 * 오케스트레이터가 v2 identity를 먼저 쓴 뒤에만 remove를 호출하도록 분리해 부분 실패
 * (CLAUDE.md만 변경되고 identity는 미변경)를 원천 차단한다.
 *
 * 안전 게이트: 컴패니언 이름이 헤딩 또는 본문에 등장하는 섹션만 대상으로 삼아 생성된
 * 지시문·무관한 사용자 콘텐츠를 건드리지 않는다. 미매칭·파싱 실패 시 no-op.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CLAUDE_MD_RELATIVE_PATH } from '../../constants/claudeMd.js';
import type { CompanionSectionMinimal } from '../../types/companionGuard.js';
import { backupPathFor } from '../backupPath/index.js';

export interface ToneRemovalResult {
  removed: boolean;
  backupPath?: string;
}

interface MatchedSection {
  key: 'comm-detail' | 'tone-detail';
  detail: string;
  /** 원본 라인 인덱스 [startLine, endLine) */
  startLine: number;
  endLine: number;
}

const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;

/** 헤딩 텍스트에서 흡수 대상 키를 판별한다. */
function classifyHeading(text: string): MatchedSection['key'] | null {
  const t = text.toLowerCase();
  if (t.startsWith('communication style')) return 'comm-detail';
  if (t.startsWith('tone')) return 'tone-detail';
  return null;
}

/**
 * Communication Style / Tone 섹션을 스캔한다. 컴패니언 이름이 헤딩 또는 본문에
 * 등장하는 섹션만(안전 게이트) 채택한다. 부작용 없음.
 */
function scanToneSections(
  lines: string[],
  companionName: string,
): MatchedSection[] {
  const name = companionName.toLowerCase();
  const matched: MatchedSection[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = HEADING_RE.exec(lines[i]);
    if (!headingMatch) continue;
    const level = headingMatch[1].length;
    const key = classifyHeading(headingMatch[2]);
    if (!key) continue;

    let end = i + 1;
    while (end < lines.length) {
      const next = HEADING_RE.exec(lines[end]);
      if (next && next[1].length <= level) break;
      end += 1;
    }

    const headingHasName = headingMatch[2].toLowerCase().includes(name);
    const body = lines
      .slice(i + 1, end)
      .join('\n')
      .trim();
    if (!body || (!headingHasName && !body.toLowerCase().includes(name)))
      continue;

    matched.push({ key, detail: body, startLine: i, endLine: end });
  }
  return matched;
}

function readClaudeMd(cwd: string): { path: string; lines: string[] } | null {
  const path = join(cwd, CLAUDE_MD_RELATIVE_PATH);
  if (!existsSync(path)) return null;
  return { path, lines: readFileSync(path, 'utf-8').split('\n') };
}

/**
 * CLAUDE.md의 tone/comm 섹션을 v2 section으로 산출한다(읽기 전용). 미매칭 시 [].
 */
export function scanClaudeMdTone(
  cwd: string,
  companionName: string,
): CompanionSectionMinimal[] {
  try {
    const file = readClaudeMd(cwd);
    if (!file) return [];
    return scanToneSections(file.lines, companionName).map((m) => ({
      key: m.key,
      inject: 'session',
      salience: 2,
      detail: m.detail,
    }));
  } catch {
    return [];
  }
}

/** 매칭된 라인 범위를 제거하고 과도한 빈 줄을 접는다. */
function stripSections(lines: string[], matched: MatchedSection[]): string {
  const removeSet = new Set<number>();
  for (const m of matched)
    for (let i = m.startLine; i < m.endLine; i += 1) removeSet.add(i);
  const kept = lines.filter((_, idx) => !removeSet.has(idx));
  return (
    kept
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}

/**
 * CLAUDE.md에서 tone/comm 섹션을 백업 후 제거한다. 미매칭·실패 시 no-op.
 * scan과 동일 로직으로 현재 파일을 재스캔해 스캔↔제거 사이 외부 편집을 덮어쓰지 않는다.
 */
export function removeClaudeMdTone(
  cwd: string,
  companionName: string,
): ToneRemovalResult {
  try {
    const file = readClaudeMd(cwd);
    if (!file) return { removed: false };
    const matched = scanToneSections(file.lines, companionName);
    if (matched.length === 0) return { removed: false };

    const backupPath = backupPathFor(file.path);
    copyFileSync(file.path, backupPath);
    writeFileSync(file.path, stripSections(file.lines, matched), 'utf-8');
    return { removed: true, backupPath };
  } catch {
    return { removed: false };
  }
}
