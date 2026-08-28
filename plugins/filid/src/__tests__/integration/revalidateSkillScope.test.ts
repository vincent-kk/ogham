import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const skill = readFileSync(
  join(packageRoot, 'skills/revalidate/SKILL.md'),
  'utf8',
);
const reference = readFileSync(
  join(packageRoot, 'skills/revalidate/reference.md'),
  'utf8',
);

function toolCalls(document: string, toolName: string): string[] {
  const marker = `mcp__plugin_filid_tools__${toolName}({`;
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

describe('revalidate measurement scope contract', () => {
  it('widens uncertain evidence without hiding an exact surviving finding', () => {
    expect(skill).toContain('context_resolve.data.results');
    expect(reference).toMatch(
      /result\.summary\.ownerFractalPath[^\n]+first scope/i,
    );
    expect(reference.indexOf('result.summary.ownerFractalPath')).toBeLessThan(
      reference.indexOf('result.summary.chainPaths'),
    );

    const precedence = reference.slice(
      reference.indexOf('Apply this precedence at each scope:'),
      reference.indexOf('Never pass `PROJECT_ROOT`'),
    );
    expect(precedence).toMatch(
      /1\. Any exact matching violation stops widening[^\n]+unresolved/i,
    );
    expect(precedence).toMatch(
      /2\.[^\n]+indeterminate[^\n]+unsupported[^\n]+next[^\n]+ancestor/i,
    );
    expect(precedence).toContain(
      '3. The first exact measurement stops widening. Absence of the matching violation is `resolved`.',
    );

    const aggregateLines = reference
      .split('\n')
      .filter((line) => /aggregate counts?/i.test(line));
    expect(aggregateLines.length).toBeGreaterThan(0);
    for (const line of aggregateLines)
      expect(line).toMatch(/never|not a search/i);

    const contextResolveCalls = toolCalls(reference, 'context_resolve');
    expect(contextResolveCalls.length).toBeGreaterThan(0);
    expect(contextResolveCalls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/path:\s*PROJECT_ROOT,[\s\S]+requests:\s*\[/),
      ]),
    );

    const structureValidateCalls = [
      ...toolCalls(skill, 'structure_validate'),
      ...toolCalls(reference, 'structure_validate'),
    ];
    expect(structureValidateCalls.length).toBeGreaterThan(0);
    for (const call of structureValidateCalls)
      expect(call).not.toMatch(/path:\s*PROJECT_ROOT/);
  });
});
