/**
 * @file github-links-parser.test.ts
 * @description Unit tests for parseLinks() — the `## Links` section parser
 *   for GitHub issue bodies.
 *
 *   3 basic + 12 complex = 15 cases (3+12 rule cap).
 */

import { describe, expect, it, vi } from 'vitest';
import { parseLinks, type GithubLinks } from '../providers/github/parse-links.js';

// ---------------------------------------------------------------------------
// Basic (3 cases)
// ---------------------------------------------------------------------------

describe('parseLinks — basic', () => {
  it('parses a single link type', () => {
    const body = '## Links\n\n- blocks: #10\n';
    const result = parseLinks(body);
    expect(result).toEqual({ blocks: ['#10'] });
  });

  it('parses all 5 link types', () => {
    const body = [
      '## Links',
      '',
      '- blocks: #10, #11',
      '- blocked-by: #5',
      '- split-from: #3',
      '- split-into: #20, #21',
      '- relates: #99',
    ].join('\n');
    const result = parseLinks(body);
    expect(result).toEqual({
      blocks: ['#10', '#11'],
      'blocked-by': ['#5'],
      'split-from': ['#3'],
      'split-into': ['#20', '#21'],
      relates: ['#99'],
    });
  });

  it('returns {} for an empty ## Links section', () => {
    const body = '## Links\n\n## Next Section\n';
    expect(parseLinks(body)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Complex (12 cases)
// ---------------------------------------------------------------------------

describe('parseLinks — complex', () => {
  it('handles owner/repo#N format', () => {
    const body = '## Links\n\n- blocks: owner/repo#45\n';
    expect(parseLinks(body)).toEqual({ blocks: ['owner/repo#45'] });
  });

  it('merges duplicate linkType keys (union)', () => {
    const body = [
      '## Links',
      '- blocks: #10',
      '- blocks: #11, #12',
    ].join('\n');
    expect(parseLinks(body)).toEqual({ blocks: ['#10', '#11', '#12'] });
  });

  it('deduplicates refs within a merged duplicate key', () => {
    const body = [
      '## Links',
      '- blocks: #10, #11',
      '- blocks: #11, #12',
    ].join('\n');
    expect(parseLinks(body)).toEqual({ blocks: ['#10', '#11', '#12'] });
  });

  it('handles comma-separated list with extra whitespace', () => {
    const body = '## Links\n\n- blocks:  #10 ,  #11 , #12  \n';
    expect(parseLinks(body)).toEqual({ blocks: ['#10', '#11', '#12'] });
  });

  it('handles mixed owner/repo#N and #N formats', () => {
    const body = '## Links\n\n- relates: #12, owner/other-repo#7, #99\n';
    expect(parseLinks(body)).toEqual({
      relates: ['#12', 'owner/other-repo#7', '#99'],
    });
  });

  it('returns {} when ## Links section is absent', () => {
    const body = '## Overview\nSome content.\n\n## Acceptance Criteria\n- [ ] done';
    expect(parseLinks(body)).toEqual({});
  });

  it('warns and skips unknown link types', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = '## Links\n\n- references: #5\n- blocks: #10\n';
    const result = parseLinks(body);
    expect(result).toEqual({ blocks: ['#10'] });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown linkType "references"')
    );
    warnSpy.mockRestore();
  });

  it('tolerates leading/trailing whitespace on item lines', () => {
    const body = '## Links\n\n  - blocks: #10  \n   - relates: #20\n';
    expect(parseLinks(body)).toEqual({ blocks: ['#10'], relates: ['#20'] });
  });

  it('stops parsing at next h2 boundary', () => {
    const body = [
      '## Links',
      '- blocks: #10',
      '',
      '## Meta',
      '- relates: #99',
    ].join('\n');
    // relates is under ## Meta, not ## Links — must not be included
    expect(parseLinks(body)).toEqual({ blocks: ['#10'] });
  });

  it('returns {} for empty string input', () => {
    expect(parseLinks('')).toEqual({});
  });

  it('handles body with ## Links section but only blank lines', () => {
    const body = '## Links\n\n   \n\n## Other\n';
    expect(parseLinks(body)).toEqual({});
  });

  it('handles links-4types fixture data', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fixturePath = join(
      __dirname, '..', '..', 'scripts', 'test-helpers', 'fixtures', 'gh', 'links-4types.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as { body: string };
    const result = parseLinks(fixture.body);
    expect(result.blocks).toEqual(['#10', '#11']);
    expect(result['blocked-by']).toEqual(['#5']);
    expect(result['split-from']).toEqual(['#3']);
    expect(result['split-into']).toEqual(['#20', '#21']);
    expect(result.relates).toEqual(['owner/repo#99']);
  });
});
