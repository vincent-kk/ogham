import path from 'path';

/**
 * Build the [filid:ctx] injection text for first visit to a directory.
 */
export function buildCtxBlock(
  relFile: string,
  intentContent: string | undefined,
  chain: string[],
  intents: Map<string, boolean>,
  details: Map<string, boolean>,
  boundary: string,
  ownerDir: string,
): string {
  const lines: string[] = [];
  lines.push(`[filid:ctx] ${relFile}`);

  // Intent line — point to owning fractal's INTENT.md, not organ's
  const ownerRelDir =
    path.relative(boundary, ownerDir).replace(/\\/g, '/') || '.';
  const intentPath = path.join(ownerRelDir, 'INTENT.md');
  lines.push(`intent: ${intentPath}`);

  if (intentContent !== undefined) {
    lines.push('---');
    lines.push(intentContent.trimEnd());
    lines.push('---');
  }

  // Chain: ancestor directories with INTENT.md, skip ownerDir (already inlined)
  const chainIntents = chain
    .filter((d) => d !== ownerDir && intents.get(d))
    .map((d) =>
      path.join(path.relative(boundary, d), 'INTENT.md').replace(/\\/g, '/'),
    );

  if (chainIntents.length > 0) {
    lines.push(`chain: ${chainIntents.join(' > ')}`);
  }

  // Detail hint (check owning fractal for DETAIL.md too)
  if (details.get(ownerDir)) {
    const detailPath = path.join(ownerRelDir, 'DETAIL.md');
    lines.push(`detail: ${detailPath}`);
  }

  return lines.join('\n');
}
