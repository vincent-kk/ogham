/**
 * @file constants/ast.ts
 * @description AST 파일 탐색 및 언어 지원 관련 상수
 */

/** 탐색당 최대 수집 파일 수 */
export const AST_MAX_FILES = 1000;

/** 파일 탐색 시 제외할 디렉터리 목록 */
export const AST_EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
]);

/**
 * 지원 언어별 파일 확장자 매핑.
 * @ast-grep/napi가 지원하는 17개 언어.
 */
export const SUPPORTED_LANGUAGES: Record<string, string[]> = {
  javascript: ['.js', '.mjs', '.cjs', '.jsx'],
  typescript: ['.ts', '.mts', '.cts'],
  tsx: ['.tsx'],
  python: ['.py'],
  ruby: ['.rb'],
  go: ['.go'],
  rust: ['.rs'],
  java: ['.java'],
  kotlin: ['.kt', '.kts'],
  swift: ['.swift'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp'],
  csharp: ['.cs'],
  html: ['.html', '.htm'],
  css: ['.css'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
};

/** 확장자 → 언어 역방향 조회 (SUPPORTED_LANGUAGES에서 파생) */
export const EXT_TO_LANG: Record<string, string> = Object.entries(
  SUPPORTED_LANGUAGES,
).reduce(
  (acc, [lang, exts]) => {
    for (const ext of exts) acc[ext] = lang;
    return acc;
  },
  {} as Record<string, string>,
);
