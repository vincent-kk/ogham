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
  return document
    .split(marker)
    .slice(1)
    .map((remainder) => marker + remainder.slice(0, remainder.indexOf('```')));
}

describe('revalidate measurement scope contract', () => {
  it('widens uncertain evidence without hiding an exact surviving finding', () => {
    expect(skill).toContain('`fractal_inspect` `resolve` batch');
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

    const contextResolveCalls = toolCalls(reference, 'fractal_inspect').filter(
      (call) => /action:\s*"resolve"/.test(call),
    );
    expect(contextResolveCalls.length).toBeGreaterThan(0);
    expect(contextResolveCalls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/path:\s*PROJECT_ROOT,[\s\S]+requests:\s*\[/),
      ]),
    );
    for (const call of contextResolveCalls)
      expect(call).toMatch(/action:\s*"resolve"/);

    const structureValidateCalls = [
      ...toolCalls(skill, 'fractal_inspect'),
      ...toolCalls(reference, 'fractal_inspect'),
    ].filter((call) => /action:\s*"validate"/.test(call));
    expect(structureValidateCalls.length).toBeGreaterThan(0);
    for (const call of structureValidateCalls) {
      expect(call).toMatch(/action:\s*"validate"/);
      expect(call).not.toMatch(/path:\s*PROJECT_ROOT/);
    }
  });
});
