import { existsSync, statSync } from 'node:fs';

import {
  pathForCompare,
  portableBasename,
  portableDirname,
  portableIsAbsolute,
  portableJoin,
} from '@ogham/cross-platform';

import type { DocumentContractFinding } from '../../../../types/fractal.js';
import {
  extractPathTokens,
  splitMarkdownSections,
} from '../../../rules/documentValidator/index.js';

/**
 * Sections whose path tokens are not live file claims: contract targets,
 * removed-path narration, and coupling addresses such as compiled specifiers.
 */
const EXEMPT_SECTIONS = new Set([
  'Boundary Exemptions',
  'Organ Exemptions',
  'History',
  'Last Updated',
  'Dependencies',
]);

/** True when the entry exists and matches the directory claim a trailing slash makes. */
function entryMatches(base: string, token: string, wantsDir: boolean): boolean {
  const target = portableJoin(base, token);
  if (!existsSync(target)) return false;
  if (!wantsDir) return true;
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/** Resolve from the doc's own directory; `..`-free tokens also try each ancestor up to projectRoot. */
function resolvesFromAncestors(
  token: string,
  wantsDir: boolean,
  nodePath: string,
  projectRoot: string,
): boolean {
  if (token.includes('..')) return entryMatches(nodePath, token, wantsDir);
  let base = nodePath;
  for (;;) {
    if (entryMatches(base, token, wantsDir)) return true;
    const parent = portableDirname(base);
    if (parent === base || pathForCompare(base) === pathForCompare(projectRoot))
      return false;
    base = parent;
  }
}

/**
 * Flag existence-asserting relative path tokens that resolve to nothing — a
 * stale reference is the drift the document rules exist to prevent. Tokens
 * resolve against every ancestor of the owning node up to the project root,
 * so package-root-relative references stay valid; `..` tokens are
 * author-relative and resolve from the node's directory only. Home (`~`) and
 * variable (`$`) spellings are unresolvable inside the repository and are
 * skipped.
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
      if (portableIsAbsolute(token) || token.startsWith('~')) continue;
      const wantsDir = token.endsWith('/');
      if (token.includes('$')) continue;
      if (!wantsDir && !portableBasename(token).includes('.')) continue;
      if (
        resolvesFromAncestors(
          token.replace(/\/+$/, ''),
          wantsDir,
          nodePath,
          projectRoot,
        )
      )
        continue;
      const where =
        section.title === '' ? 'the preamble' : `section "${section.title}"`;
      findings.push({
        document,
        rule: 'stale-path',
        section: section.title,
        message: `Path token \`${token}\` in ${where} resolves to nothing from ${nodePath}, its ancestors, or the project root — the reference has drifted or never existed.`,
        severity: 'warning',
      });
    }
  }
  return findings;
}
