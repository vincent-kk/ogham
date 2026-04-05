import { describe, expect, it, vi } from 'vitest';
import { parseLinks } from '../providers/github/index.js';

describe('parseLinks — basic', () => {
  it('parses a single link type', () => {
    expect(parseLinks('## Links\n\n- blocks: #10\n')).toEqual({
      blocks: ['#10'],
    });
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
    expect(parseLinks(body)).toEqual({
      blocks: ['#10', '#11'],
      'blocked-by': ['#5'],
      'split-from': ['#3'],
      'split-into': ['#20', '#21'],
      relates: ['#99'],
    });
  });

  it('returns {} for an empty ## Links section', () => {
    expect(parseLinks('## Links\n\n## Next Section\n')).toEqual({});
  });
});

describe('parseLinks — complex', () => {
  it.each([
    {
      name: 'owner/repo#N format',
      body: '## Links\n\n- blocks: owner/repo#45\n',
      expected: { blocks: ['owner/repo#45'] },
    },
    {
      name: 'merges duplicate linkType keys (union)',
      body: ['## Links', '- blocks: #10', '- blocks: #11, #12'].join('\n'),
      expected: { blocks: ['#10', '#11', '#12'] },
    },
    {
      name: 'deduplicates refs within a merged duplicate key',
      body: ['## Links', '- blocks: #10, #11', '- blocks: #11, #12'].join('\n'),
      expected: { blocks: ['#10', '#11', '#12'] },
    },
    {
      name: 'comma-separated list with extra whitespace',
      body: '## Links\n\n- blocks:  #10 ,  #11 , #12  \n',
      expected: { blocks: ['#10', '#11', '#12'] },
    },
    {
      name: 'mixed owner/repo#N and #N formats',
      body: '## Links\n\n- relates: #12, owner/other-repo#7, #99\n',
      expected: { relates: ['#12', 'owner/other-repo#7', '#99'] },
    },
    {
      name: '## Links section absent',
      body: '## Overview\nSome content.\n\n## Acceptance Criteria\n- [ ] done',
      expected: {},
    },
    {
      name: 'leading/trailing whitespace on item lines',
      body: '## Links\n\n  - blocks: #10  \n   - relates: #20\n',
      expected: { blocks: ['#10'], relates: ['#20'] },
    },
    {
      name: 'stops at next h2 boundary',
      body: ['## Links', '- blocks: #10', '', '## Meta', '- relates: #99'].join('\n'),
      expected: { blocks: ['#10'] },
    },
    { name: 'empty string input', body: '', expected: {} },
    {
      name: '## Links section with only blank lines',
      body: '## Links\n\n   \n\n## Other\n',
      expected: {},
    },
  ])('$name', ({ body, expected }) => {
    expect(parseLinks(body)).toEqual(expected);
  });

  it('warns and skips unknown link types', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseLinks('## Links\n\n- references: #5\n- blocks: #10\n');
    expect(result).toEqual({ blocks: ['#10'] });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown linkType "references"')
    );
    warnSpy.mockRestore();
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
