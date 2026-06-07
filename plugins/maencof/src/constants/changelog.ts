import type { ChangelogCategory } from '../types/changelog.js';

export const CHANGELOG_CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  knowledge: '지식 변경',
  structure: '구조 변경',
  automation: '자동화',
  learning: '학습',
  preference: '사용자 선호 확인',
};

export const CHANGELOG_CATEGORY_ORDER: ChangelogCategory[] = [
  'knowledge',
  'structure',
  'automation',
  'learning',
  'preference',
];

export const WATCHED_PATHS = [
  '01_Core/',
  '02_Derived/',
  '.claude/agents/',
  '.claude/rules/',
  'CLAUDE.md',
] as const;

export const CHANGELOG_EXCLUDE = '02_Derived/changelog/';

export const CHANGELOG_DIR = '02_Derived/changelog';
