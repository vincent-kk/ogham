/** fix-requests.md에서 파싱한 단일 항목. */
export interface FixRequestItem {
  id: string;
  title: string;
  severity: string;
  source: string;
  filePath: string;
  rule: string;
  recommendedAction: string;
}

/**
 * fix-requests.md에서 FIX-XXX 블록들을 파싱한다.
 * 파싱 실패 시 빈 배열을 반환한다 (graceful degradation).
 */
export function parseFixRequests(content: string): FixRequestItem[] {
  const items: FixRequestItem[] = [];

  const blocks = content.split(/^## (FIX-\d+):\s*/m);

  for (let i = 1; i < blocks.length; i += 2) {
    const id = blocks[i];
    const body = blocks[i + 1] ?? '';

    const titleLine = body.split('\n')[0]?.trim() ?? '';

    const severity =
      body.match(/-\s*\*\*Severity\*\*:\s*(\w+)/)?.[1] ?? 'MEDIUM';
    const source =
      body.match(/-\s*\*\*Source\*\*:\s*([\w-]+)/)?.[1] ?? 'unknown';
    const filePath =
      body.match(/-\s*\*\*Path\*\*:\s*`?([^`\n]+)`?/)?.[1]?.trim() ?? '';
    const rule = body.match(/-\s*\*\*Rule\*\*:\s*([\w-]+)/)?.[1] ?? '';
    const recommendedAction =
      body.match(/-\s*\*\*Recommended Action\*\*:\s*(.+)/)?.[1]?.trim() ??
      titleLine;

    items.push({
      id,
      title: titleLine,
      severity: severity.toUpperCase(),
      source,
      filePath,
      rule,
      recommendedAction,
    });
  }

  return items;
}
