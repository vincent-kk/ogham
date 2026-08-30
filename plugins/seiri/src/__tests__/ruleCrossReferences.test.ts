import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

/**
 * A mechanical drift guard on section citations: every `seiri_<rule>` §N in a
 * rule, a skill, a module document or a source comment resolves to a `## N.`
 * heading in that rule, and every bare §N inside a rule resolves to its own
 * headings. It catches a citation of a section that no longer exists; it does
 * not catch a renumbering that lands on another existing section.
 */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const rulesDir = portableJoin(packageRoot, 'templates', 'rules');
const SKIP = new Set(['node_modules', 'dist', 'bridge', 'public']);
const SCANNED = /\.(md|ts)$/;
const NAMED = /\b(seiri_[a-z-]+)(?:\.md)?`?\s*§(\d+)/g;
const BARE = /§(\d+)/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = portableJoin(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SCANNED.test(name) ? [path] : [];
  });
}

const headings = new Map<string, Set<number>>(
  readdirSync(rulesDir)
    .filter((name) => name.startsWith('seiri_') && name.endsWith('.md'))
    .map((name) => {
      const text = readFileSync(portableJoin(rulesDir, name), 'utf8');
      const numbers = Array.from(text.matchAll(/^## (\d+)\./gm), (match) =>
        Number(match[1]),
      );
      return [name.slice(0, -'.md'.length), new Set(numbers)];
    }),
);

describe('rule section citations', () => {
  it('resolves every seiri_<rule> §N to an existing heading', () => {
    const files = ['skills', 'src', 'templates'].flatMap((dir) =>
      sourceFiles(portableJoin(packageRoot, dir)),
    );
    const broken = files.flatMap((file) =>
      Array.from(readFileSync(file, 'utf8').matchAll(NAMED))
        .filter(([, rule, number]) => !headings.get(rule)?.has(Number(number)))
        .map(([, rule, number]) => `${file}: ${rule} §${number}`),
    );

    expect(broken).toEqual([]);
    expect(headings.get('seiri_naming')?.has(99)).toBe(false);
  });

  it("resolves every bare §N inside a rule to that rule's own headings", () => {
    const broken = Array.from(headings).flatMap(([rule, own]) => {
      const text = readFileSync(
        portableJoin(rulesDir, `${rule}.md`),
        'utf8',
      ).replace(NAMED, '');
      return Array.from(text.matchAll(BARE))
        .filter(([, number]) => !own.has(Number(number)))
        .map(([, number]) => `${rule} §${number}`);
    });

    expect(broken).toEqual([]);
  });
});
