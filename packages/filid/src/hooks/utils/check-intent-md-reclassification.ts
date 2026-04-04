import * as path from 'node:path';

import { isIntentMd } from '../shared.js';
import { isOrganByStructure } from './organ-structure-checker.js';

export function checkIntentMdReclassification(
  toolName: string,
  filePath: string,
  cwd: string,
  segments: string[],
): string[] {
  // INTENT.md Write → organ directory reclassification notice.
  // FCA: "Fractal nodes CAN exist inside organ directories."
  // classifyNode priority 1 (hasIntentMd → fractal) guarantees reclassification.
  if (toolName !== 'Write' || !isIntentMd(filePath)) {
    return [];
  }
  const info: string[] = [];
  let dirSoFar = cwd;
  for (const segment of segments) {
    dirSoFar = path.join(dirSoFar, segment);
    if (isOrganByStructure(dirSoFar)) {
      info.push(
        `"${segment}" has been reclassified from organ to fractal by INTENT.md creation.`,
      );
      break;
    }
  }
  return info;
}
