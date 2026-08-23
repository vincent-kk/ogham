import {
  normalize,
  portableIsAbsolute,
  portableJoin,
  portableRelative,
} from '@ogham/cross-platform';

import {
  DETAIL_MD,
  INTENT_MD,
} from '../../../../../constants/documentFiles.js';
import { HOOK_CTX_READ_DIRECTIVE } from '../../../../../constants/hookContext.js';

/**
 * Build the [filid:ctx] pointer block for a visit: the owner INTENT.md path,
 * the standing read directive, parent chain paths and the DETAIL.md hint.
 * Every path is printed relative to the hook cwd — the directory the agent's
 * Read tool resolves against — or absolute when it lies outside it. The
 * block names documents; it never carries their bodies.
 * @param cwd Validated hook cwd (the project root the agent works in).
 * @param filePath Absolute path of the visited file.
 * @param chain Ancestor directories from the file's directory up to the boundary.
 * @param intents INTENT.md presence per chain directory.
 * @param details DETAIL.md presence per chain directory.
 * @param ownerDir Absolute directory of the owning fractal (holds the INTENT.md to read).
 * @returns Newline-joined block text.
 */
export function buildCtxBlock(
  cwd: string,
  filePath: string,
  chain: string[],
  intents: Map<string, boolean>,
  details: Map<string, boolean>,
  ownerDir: string,
): string {
  const lines: string[] = [];
  lines.push(`[filid:ctx] ${displayPath(cwd, filePath)}`);
  lines.push(`intent: ${displayPath(cwd, portableJoin(ownerDir, INTENT_MD))}`);
  lines.push(HOOK_CTX_READ_DIRECTIVE);

  const chainIntents = chain
    .filter((d) => d !== ownerDir && intents.get(d))
    .map((d) => displayPath(cwd, portableJoin(d, INTENT_MD)));
  if (chainIntents.length > 0) lines.push(`chain: ${chainIntents.join(' > ')}`);

  if (details.get(ownerDir))
    lines.push(
      `detail: ${displayPath(cwd, portableJoin(ownerDir, DETAIL_MD))}`,
    );

  return lines.join('\n');
}

/** cwd-relative form of an absolute path; absolute when it escapes cwd. */
function displayPath(cwd: string, absolutePath: string): string {
  const relative = normalize(portableRelative(cwd, absolutePath));
  return relative.startsWith('..') || portableIsAbsolute(relative)
    ? normalize(absolutePath)
    : relative;
}
