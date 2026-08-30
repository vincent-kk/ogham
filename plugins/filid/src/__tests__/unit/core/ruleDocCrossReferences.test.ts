import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * A mechanical drift guard on section citations. A named `filid_<rule>` §N,
 * or a cross-plugin `seiri_<rule>` §N when seiri is present beside filid, must
 * resolve to an existing `## N.` heading. Bare §N citations inside a filid rule
 * resolve to that rule's own headings. This does not detect a renumbering that
 * happens to land on another existing section.
 */
const packageRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const rulesDir = join(packageRoot, 'templates', 'rules');
const seiriRulesDir = join(packageRoot, '..', 'seiri', 'templates', 'rules');
const SKIP = new Set([
  'node_modules',
  'dist',
  'bridge',
  'public',
  '.codex-plugin',
]);
const SCANNED = /\.(md|ts)$/;
const NAMED = /\b((?:filid|seiri)_[a-z-]+)(?:\.md)?`?\s*§(\d+)/g;
const BARE = /§(\d+)/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SCANNED.test(name) ? [path] : [];
  });
}

function ruleHeadings(dir: string, prefix: string): [string, Set<number>][] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.md'))
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const numbers = Array.from(text.matchAll(/^## (\d+)\./gm), (match) =>
        Number(match[1]),
      );
      return [name.slice(0, -'.md'.length), new Set(numbers)];
    });
}

const headings = new Map<string, Set<number>>([
  ...ruleHeadings(rulesDir, 'filid_'),
  ...ruleHeadings(seiriRulesDir, 'seiri_'),
]);

describe('rule document section citations', () => {
  it('resolves every named §N to an available rule heading', () => {
    const files = ['skills', 'src', 'templates'].flatMap((dir) =>
      sourceFiles(join(packageRoot, dir)),
    );
    const broken = files.flatMap((file) =>
      Array.from(readFileSync(file, 'utf8').matchAll(NAMED))
        .filter(([, rule, number]) => {
          if (rule.startsWith('seiri_') && !existsSync(seiriRulesDir))
            return false;
          return !headings.get(rule)?.has(Number(number));
        })
        .map(([, rule, number]) => `${file}: ${rule} §${number}`),
    );

    expect(broken).toEqual([]);
    expect(headings.get('filid_fractal-boundaries')?.has(99)).toBe(false);
  });

  it("resolves every bare §N inside a filid rule to that rule's headings", () => {
    const broken = ruleHeadings(rulesDir, 'filid_').flatMap(([rule, own]) => {
      const text = readFileSync(join(rulesDir, `${rule}.md`), 'utf8').replace(
        NAMED,
        '',
      );
      return Array.from(text.matchAll(BARE))
        .filter(([, number]) => !own.has(Number(number)))
        .map(([, number]) => `${rule} §${number}`);
    });

    expect(broken).toEqual([]);
  });
});
