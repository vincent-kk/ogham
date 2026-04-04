import { extractImportPaths } from './extract-import-paths.js';
import { isAncestorPath } from './is-ancestor-path.js';

export function checkCircularImports(
  filePath: string,
  content: string,
  cwd: string,
): string[] {
  // 검사 3: 잠재적 순환 의존
  if (!content) {
    return [];
  }
  const importPaths = extractImportPaths(content);
  const circularCandidates = importPaths.filter((p) =>
    isAncestorPath(filePath, p, cwd),
  );
  if (circularCandidates.length > 0) {
    return [
      `The following imports reference ancestor modules (potential circular dependency): ` +
        circularCandidates.map((p) => `"${p}"`).join(', '),
    ];
  }
  return [];
}
