import {
  normalize,
  portableJoin,
  portableRelative,
} from '@ogham/cross-platform';

import {
  DETAIL_MD,
  INTENT_MD,
} from '../../../../../constants/documentFiles.js';
import { PORTABLE_PATH_MARKERS } from '../../../../../constants/pathMarkers.js';

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
    normalize(portableRelative(boundary, ownerDir)) ||
    PORTABLE_PATH_MARKERS.CURRENT;
  const intentPath = normalize(portableJoin(ownerRelDir, INTENT_MD));
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
      normalize(portableJoin(portableRelative(boundary, d), INTENT_MD)),
    );

  if (chainIntents.length > 0) lines.push(`chain: ${chainIntents.join(' > ')}`);

  // Detail hint (check owning fractal for DETAIL.md too)
  if (details.get(ownerDir)) {
    const detailPath = normalize(portableJoin(ownerRelDir, DETAIL_MD));
    lines.push(`detail: ${detailPath}`);
  }

  return lines.join('\n');
}
