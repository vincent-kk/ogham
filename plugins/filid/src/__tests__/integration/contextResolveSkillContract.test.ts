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
  'skills/revalidate/SKILL.md',
  'skills/revalidate/reference.md',
  'skills/pull-request/SKILL.md',
  'skills/pull-request/reference.md',
] as const;
const documents = Object.fromEntries(
  skillPaths.map((path) => [
    path,
    readFileSync(join(packageRoot, path), 'utf8'),
  ]),
);

/** Extract explicit resolve calls whose argument object ends at the next fence. */
function resolveCalls(document: string): string[] {
  const marker = 'mcp__plugin_filid_tools__fractal_inspect({';
  return document
    .split(marker)
    .slice(1)
    .map((remainder) => marker + remainder.slice(0, remainder.indexOf('```')))
    .filter((call) => /action:\s*"resolve"/.test(call));
}

describe('shipped fractal_inspect resolve caller contract', () => {
  it('uses requests arrays in every explicit tool-call example', () => {
    const calls = Object.values(documents).flatMap(resolveCalls);

    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const call of calls) {
      expect(call).toMatch(/action:\s*"resolve"/);
      expect(call).toMatch(/\n\s+requests:\s*\[/);
      const topLevelIndent = call.match(/\n([ \t]*)path:/)?.[1];
      expect(topLevelIndent).toBeDefined();
      expect(call).not.toContain(`\n${topLevelIndent}targetPath:`);
      expect(call).not.toContain(`\n${topLevelIndent}comparePaths:`);
    }
  });

  it('batches multi-target enrich, revalidate, and pull-request work', () => {
    expect(documents['skills/enrich-docs/SKILL.md']).toMatch(
      /one `fractal_inspect` `resolve` batch/i,
    );
    expect(documents['skills/revalidate/SKILL.md']).toMatch(
      /one `fractal_inspect` `resolve` batch/i,
    );
    expect(documents['skills/pull-request/SKILL.md']).toMatch(
      /one `fractal_inspect` `resolve` batch/i,
    );
  });

  it('reads owner and chain fields from ordered result items', () => {
    const combined = Object.values(documents).join('\n');

    expect(combined).not.toContain('fractal_inspect.summary.ownerFractalPath');
    expect(combined).not.toContain('fractal_inspect.summary.chainPaths');
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

  it('keeps non-FCA PR scope exclusions explicit and deletion-safe', () => {
    const skill = documents['skills/pull-request/SKILL.md'];
    const reference = documents['skills/pull-request/reference.md'];

    expect(skill).toContain('structure.additionalExcludedDirectories');
    expect(skill).toContain('context-target-unresolved');
    expect(skill).toContain('git cat-file -e HEAD:<path>');
    expect(skill).toContain('resolved: false');
    expect(reference).toContain('Non-FCA document scope');
    expect(reference).toContain('deleted or renamed source');
  });

  it('does not pre-filter config exclusions that retain an enclosing owner', () => {
    const skill = documents['skills/pull-request/SKILL.md'];
    const reference = documents['skills/pull-request/reference.md'];

    expect(skill).not.toContain('do not send it to `fractal_inspect`');
    expect(skill).toContain('all changed paths');
    expect(reference).toContain('still FCA-owned');
    expect(reference).toContain('reason, not an ownership override');
  });
});
