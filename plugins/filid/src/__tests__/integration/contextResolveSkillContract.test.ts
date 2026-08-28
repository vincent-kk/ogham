import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const skillPaths = [
  'skills/context-query/SKILL.md',
  'skills/context-query/reference.md',
  'skills/enrich-docs/SKILL.md',
  'skills/enrich-docs/reference.md',
  'skills/enrich-docs/tables.md',
  'skills/revalidate/SKILL.md',
  'skills/revalidate/reference.md',
  'skills/pull-request/SKILL.md',
] as const;
const documents = Object.fromEntries(
  skillPaths.map((path) => [
    path,
    readFileSync(join(packageRoot, path), 'utf8'),
  ]),
);

/** Extract explicit calls whose argument object ends at the next fence. */
function toolCalls(document: string): string[] {
  const marker = 'mcp__plugin_filid_tools__context_resolve({';
  const calls: string[] = [];
  let cursor = 0;
  while (cursor < document.length) {
    const start = document.indexOf(marker, cursor);
    if (start < 0) break;
    const end = document.indexOf('```', start);
    if (end < 0) break;
    calls.push(document.slice(start, end));
    cursor = end + 3;
  }
  return calls;
}

describe('shipped context_resolve caller contract', () => {
  it('uses requests arrays in every explicit tool-call example', () => {
    const calls = Object.values(documents).flatMap(toolCalls);

    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const call of calls) {
      expect(call).toMatch(/\n\s+requests:\s*\[/);
      const topLevelIndent = call.match(/\n([ \t]*)path:/)?.[1];
      expect(topLevelIndent).toBeDefined();
      expect(call).not.toContain(`\n${topLevelIndent}targetPath:`);
      expect(call).not.toContain(`\n${topLevelIndent}comparePaths:`);
    }
  });

  it('batches multi-target enrich, revalidate, and pull-request work', () => {
    expect(documents['skills/enrich-docs/SKILL.md']).toMatch(
      /one context_resolve batch/i,
    );
    expect(documents['skills/revalidate/SKILL.md']).toMatch(
      /one context_resolve batch/i,
    );
    expect(documents['skills/pull-request/SKILL.md']).toMatch(
      /one context_resolve batch/i,
    );
  });

  it('reads owner and chain fields from ordered result items', () => {
    const combined = Object.values(documents).join('\n');

    expect(combined).not.toContain('context_resolve.summary.ownerFractalPath');
    expect(combined).not.toContain('context_resolve.summary.chainPaths');
    expect(documents['skills/context-query/reference.md']).toContain(
      'data.results[0]',
    );
    expect(documents['skills/revalidate/reference.md']).toContain(
      'result.summary.ownerFractalPath',
    );
    expect(documents['skills/revalidate/reference.md']).toContain(
      'result.summary.chainPaths',
    );
  });
});
