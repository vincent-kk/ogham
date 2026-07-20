import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

import { INTENT_MD } from '../../../../../constants/documentFiles.js';

/**
 * Find INTENT.md for a directory: check fileDir first, then walk up the
 * chain to the nearest ancestor with INTENT.md (the owning fractal), and
 * read its content.
 */
export function resolveOwnerIntent(
  fileDir: string,
  chain: string[],
  intents: Map<string, boolean>,
): { intentContent: string | undefined; ownerDir: string } {
  let intentAbsPath: string | undefined;
  let ownerDir = fileDir;

  if (existsSync(path.join(fileDir, INTENT_MD)))
    intentAbsPath = path.join(fileDir, INTENT_MD);
  else
    for (let i = 1; i < chain.length; i++)
      if (intents.get(chain[i])) {
        intentAbsPath = path.join(chain[i], INTENT_MD);
        ownerDir = chain[i];
        break;
      }

  let intentContent: string | undefined;
  if (intentAbsPath)
    try {
      intentContent = readFileSync(intentAbsPath, 'utf-8');
    } catch {
      // ignore
    }

  return { intentContent, ownerDir };
}
