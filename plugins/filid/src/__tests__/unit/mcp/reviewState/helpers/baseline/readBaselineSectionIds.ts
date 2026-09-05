/**
 * Read ID cells only within one canonical report section.
 * @param reportText Complete canonical report normalized by line boundaries.
 * @param title Exact second-level heading whose ID rows form the expected set.
 * @returns Unique FCA and reviewer IDs from the section's first table column.
 * @throws When the required report section is absent.
 */
export function readBaselineSectionIds(
  reportText: string,
  title: string,
): Set<string> {
  const lines = reportText.split(/\r?\n/);
  const start = lines.indexOf(`## ${title}`);
  if (start < 0) throw new Error(`Baseline section is missing: ${title}`);
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith('## '),
  );
  return new Set(
    lines
      .slice(start + 1, end < 0 ? undefined : end)
      .flatMap(
        (line) => line.match(/^\|\s*((?:FCA-\d+|R\d+-\d+))\s*\|/)?.[1] ?? [],
      ),
  );
}
