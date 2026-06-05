/** structure-check.md의 YAML frontmatter를 파싱한다. */
export interface StructureCheckFrontmatter {
  stageResults: Record<string, string>;
  criticalCount: number;
  overall: string;
}

/**
 * structure-check.md의 YAML frontmatter를 파싱한다.
 * 파싱 실패 시 null을 반환한다 (graceful degradation).
 */
export function parseStructureCheckFrontmatter(
  content: string,
): StructureCheckFrontmatter | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const yaml = fmMatch[1];

  const stageResults: Record<string, string> = {};
  const stageBlock = yaml.match(/stage_results:\n((?:\s+\w+:.*\n)*)/);
  if (stageBlock) {
    const lines = stageBlock[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\s+(\w+):\s*(PASS|FAIL|SKIP)/);
      if (match) {
        stageResults[match[1]] = match[2];
      }
    }
  }

  const ccMatch = yaml.match(/critical_count:\s*(\d+)/);
  const criticalCount = ccMatch ? parseInt(ccMatch[1], 10) : 0;

  const overallMatch = yaml.match(/overall:\s*(PASS|FAIL)/);
  const overall = overallMatch ? overallMatch[1] : 'UNKNOWN';

  return { stageResults, criticalCount, overall };
}
