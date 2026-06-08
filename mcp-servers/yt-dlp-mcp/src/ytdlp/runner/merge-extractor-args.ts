/** Collapses repeated `--extractor-args IE_KEY:...` into one flag per IE_KEY;
 * yt-dlp keeps only the last occurrence per extractor, so separate player_client
 * and lang flags would silently drop one. Repeated sub-keys take their last value. */
export function mergeExtractorArgs(argv: string[]): string[] {
  const merged = new Map<string, Map<string, string>>();
  const ieOrder: string[] = [];
  const rest: string[] = [];
  let insertAt = -1;

  for (let i = 0; i < argv.length; i++) {
    const payload = argv[i + 1];
    if (argv[i] === '--extractor-args' && payload !== undefined) {
      const colon = payload.indexOf(':');
      if (colon > 0) {
        const ieKey = payload.slice(0, colon);
        if (!merged.has(ieKey)) {
          merged.set(ieKey, new Map());
          ieOrder.push(ieKey);
        }
        const bag = merged.get(ieKey)!;
        for (const part of payload.slice(colon + 1).split(';')) {
          if (!part) continue;
          const eq = part.indexOf('=');
          if (eq > 0) bag.set(part.slice(0, eq), part.slice(eq + 1));
        }
        if (insertAt === -1) insertAt = rest.length;
        i++;
        continue;
      }
    }
    rest.push(argv[i]);
  }

  if (ieOrder.length === 0) return rest;

  const flags = ieOrder.flatMap((ieKey) => {
    const body = [...merged.get(ieKey)!].map(([k, v]) => `${k}=${v}`).join(';');
    return ['--extractor-args', `${ieKey}:${body}`];
  });

  rest.splice(insertAt, 0, ...flags);
  return rest;
}
