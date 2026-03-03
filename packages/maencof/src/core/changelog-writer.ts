/**
 * @file changelog-writer.ts
 * @description Changelog 생성/추가 유틸리티
 *
 * 02_Derived/changelog/YYYY-MM-DD.md 파일을 생성하고 엔트리를 추가한다.
 * dailynote-writer.ts와 동급의 파일시스템 I/O 예외 모듈.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import type { ChangelogCategory, ChangelogEntry } from '../types/changelog.js';
import {
  CHANGELOG_CATEGORY_LABELS,
  CHANGELOG_CATEGORY_ORDER,
  CHANGELOG_DIR,
} from '../types/changelog.js';

import { formatDate } from './dailynote-writer.js';

/**
 * changelog 디렉토리 경로를 반환한다.
 */
export function getChangelogDir(cwd: string): string {
  return join(cwd, CHANGELOG_DIR);
}

/**
 * 특정 날짜의 changelog 파일 경로를 반환한다.
 * @param date - YYYY-MM-DD 형식 (미지정 시 오늘)
 */
export function getChangelogPath(cwd: string, date?: string): string {
  const d = date ?? formatDate(new Date());
  return join(getChangelogDir(cwd), `${d}.md`);
}

/**
 * Changelog frontmatter를 생성한다.
 */
export function buildChangelogFrontmatter(date: string): string {
  return [
    '---',
    `created: ${date}`,
    `updated: ${date}`,
    'layer: 2',
    'tags: [changelog, growth, daily]',
    '---',
  ].join('\n');
}

/**
 * 단일 카테고리의 엔트리 목록을 마크다운 섹션으로 포맷한다.
 */
function formatCategorySection(
  category: ChangelogCategory,
  list: ChangelogEntry[],
): string[] {
  const label = CHANGELOG_CATEGORY_LABELS[category];
  const items = list.map((entry) => {
    const pathSuffix = entry.paths?.length
      ? ` — \`${entry.paths.join('`, `')}\``
      : '';
    return `- ${entry.description}${pathSuffix}`;
  });
  return [`### ${label}`, '', ...items, ''];
}

/**
 * 카테고리별로 그룹된 엔트리를 마크다운 본문으로 포맷한다.
 */
export function formatChangelogBody(entries: ChangelogEntry[]): string {
  const grouped = new Map<ChangelogCategory, ChangelogEntry[]>();

  for (const entry of entries) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }

  return CHANGELOG_CATEGORY_ORDER
    .filter((cat) => grouped.has(cat) && grouped.get(cat)!.length > 0)
    .flatMap((cat) => formatCategorySection(cat, grouped.get(cat)!))
    .join('\n');
}

/**
 * 새 changelog 파일을 생성한다.
 * 이미 존재하면 아무 작업도 하지 않는다.
 */
export function createChangelogFile(cwd: string, date?: string): string {
  const d = date ?? formatDate(new Date());
  const filePath = getChangelogPath(cwd, d);
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  if (!existsSync(filePath)) {
    const content = [
      buildChangelogFrontmatter(d),
      '',
      `## Changelog — ${d}`,
      '',
    ].join('\n');
    writeFileSync(filePath, content, 'utf-8');
  }

  return filePath;
}

/**
 * 기존 changelog 파일에 엔트리를 추가한다.
 * 파일이 없으면 새로 생성 후 추가한다.
 */
export function appendChangelogEntries(
  cwd: string,
  entries: ChangelogEntry[],
  date?: string,
): void {
  if (entries.length === 0) return;

  const d = date ?? formatDate(new Date());
  const filePath = createChangelogFile(cwd, d);
  const body = formatChangelogBody(entries);

  appendFileSync(filePath, body, 'utf-8');
}

/**
 * 기존 changelog 파일 내용을 읽는다.
 * 파일이 없으면 null을 반환한다.
 */
export function readChangelog(cwd: string, date?: string): string | null {
  const filePath = getChangelogPath(cwd, date);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}
