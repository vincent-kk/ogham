import { existsSync } from 'node:fs';

import { portableIsAbsolute, portableJoin } from '@ogham/cross-platform';

import type { DocumentContractFinding } from '../../../../types/fractal.js';
import {
  extractPathTokens,
  splitMarkdownSections,
} from '../../../rules/documentValidator/index.js';

/** Section headings whose path tokens are contract targets, not references. */
const EXEMPT_SECTIONS = new Set(['Boundary Exemptions', 'Organ Exemptions']);

/**
 * Flag relative path tokens that resolve to nothing on disk — a stale
 * reference is the drift the document rules exist to prevent. Tokens resolve
 * against the owning node's directory first, then the project root.
 */
export function detectStaleDocPaths(
  content: string,
  document: DocumentContractFinding['document'],
  nodePath: string,
  projectRoot: string,
): DocumentContractFinding[] {
  const findings: DocumentContractFinding[] = [];
  for (const section of splitMarkdownSections(content)) {
    if (EXEMPT_SECTIONS.has(section.title)) continue;
    for (const token of extractPathTokens(section.body)) {
      if (portableIsAbsolute(token)) continue;
      if (
        existsSync(portableJoin(nodePath, token)) ||
        existsSync(portableJoin(projectRoot, token))
      )
        continue;
      findings.push({
        document,
        rule: 'stale-path',
        message: `Path token \`${token}\` resolves to nothing from ${nodePath} or the project root — the reference has drifted or never existed.`,
        severity: 'warning',
      });
    }
  }
  return findings;
}
