import { portableBasename } from '@ogham/cross-platform';

import type {
  DocumentContractFinding,
  FractalNode,
} from '../../../../types/fractal.js';
import {
  extractPathTokens,
  splitMarkdownSections,
} from '../../../rules/documentValidator/index.js';

/** Below this many direct children, naming them all is not an inventory. */
const MIN_CHILD_COUNT = 4;

/**
 * Flag an INTENT section that names half or more of the node's own direct
 * children: that is `ls` output restated, not a boundary decision.
 */
export function detectStructureEnumeration(
  node: FractalNode,
  content: string,
): DocumentContractFinding[] {
  const childNames = new Set(
    [...node.childFractalPaths, ...node.organPaths].map((childPath) =>
      portableBasename(childPath),
    ),
  );
  if (childNames.size < MIN_CHILD_COUNT) return [];
  const findings: DocumentContractFinding[] = [];
  for (const section of splitMarkdownSections(content)) {
    const mentioned = new Set(
      extractPathTokens(section.body)
        .map((token) => portableBasename(token))
        .filter((basename) => childNames.has(basename)),
    );
    if (mentioned.size * 2 < childNames.size) continue;
    const where =
      section.title === '' ? 'The preamble' : `Section "${section.title}"`;
    findings.push({
      document: 'intent',
      rule: 'derivable-structure',
      section: section.title,
      message: `${where} names ${mentioned.size} of this node's ${childNames.size} children — a directory listing. Keep only what the tree cannot say.`,
      severity: 'warning',
    });
  }
  return findings;
}
