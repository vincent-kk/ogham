// filid:contract AC-facts-aliases
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { computeResolutionEpoch } from '../../core/facts/index.js';
import { referencesInSource } from '../analysis/references/referencesInSource.js';
import { resolveSpecifier } from '../analysis/references/resolveSpecifier.js';
import { readResolutionAliases } from '../utils/input/readResolutionAliases.js';
import { toReference } from '../utils/records/toReference.js';
import { extractFileFacts } from '../index.js';

const roots: string[] = [];

/**
 * Create a temporary tree holding the requested files.
 * @param files Project-relative paths mapped to fixture contents.
 * @returns Project root to use for substitutions.
 */
function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-alias-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, text);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('reference substitution aliases', () => {
  it('(a) resolves wildcard aliases and passes the project list through extraction', async () => {
    const aliases = [{ from: '@app/*', to: 'src/*' }];
    const root = project({
      '.filid/config.json': JSON.stringify({ resolution: { aliases } }),
      'src/x/y.ts': 'export const value = 1;',
      'consumer.ts': "import '@app/x/y';",
    });
    expect(resolveSpecifier(join(root, 'consumer.ts'), '@app/x/y', aliases, root)).toBe(join(root, 'src/x/y.ts'));
    expect(readResolutionAliases(root)).toEqual(aliases);
    const result = await extractFileFacts(root, ['consumer.ts'], 'test');
    expect(result.records[0].references[0].resolved).toEqual({ path: 'src/x/y.ts' });
  });

  it('(b) uses the longest wildcard prefix independent of list order', () => {
    const root = project({ 'src/ui/button.ts': '', 'specific/button/index.ts': '' });
    const aliases = [{ from: '@app/*', to: 'src/*' }, { from: '@app/ui/*', to: 'specific/*' }];
    for (const list of [aliases, [...aliases].reverse()])
      expect(resolveSpecifier(join(root, 'consumer.ts'), '@app/ui/button', list, root)).toBe(join(root, 'specific/button/index.ts'));
  });

  it('(b-exact) chooses exact before wildcard with stable resolution and epoch', () => {
    const root = project({ 'exact.ts': '', 'wild/c.ts': '', 'wild/d.ts': '' });
    const aliases = [{ from: 'ab*', to: 'wild/*' }, { from: 'abc', to: 'exact' }];
    for (const list of [aliases, [...aliases].reverse()]) {
      expect(resolveSpecifier(join(root, 'consumer.ts'), 'abc', list, root)).toBe(join(root, 'exact.ts'));
      expect(resolveSpecifier(join(root, 'consumer.ts'), 'abd', list, root)).toBe(join(root, 'wild/d.ts'));
    }
    expect(computeResolutionEpoch(root, [], [], aliases).resolutionEpoch).toBe(computeResolutionEpoch(root, [], [], [...aliases].reverse()).resolutionEpoch);
  });

  it('(c) keeps matched missing paths unresolved during record conversion', () => {
    const root = project({});
    const aliases = [{ from: '@app/*', to: 'src/*' }];
    const [reference] = referencesInSource(join(root, 'consumer.ts'), "import '@app/missing';", undefined, aliases, root);
    expect(reference).toMatchObject({ resolvedPath: null });
    expect(reference.external).toBeUndefined();
    expect(toReference(root, reference).resolved).toEqual({ unresolved: true });
  });

  it('(d) preserves unmatched packages as external for static, dynamic and re-export references', () => {
    const root = project({});
    const references = referencesInSource(join(root, 'consumer.ts'), "import 'react'; import('other'); export { value } from 'package';", undefined, [], root);
    expect(references.map((reference) => reference.external)).toEqual(['react', 'other', 'package']);
    expect(toReference(root, references[0]).resolved).toEqual({ external: 'react' });
  });

  it('(e) preserves relative path and source extension resolution', () => {
    const root = project({ 'src/value.ts': '', 'src/dotted.helpers.ts': '' });
    const aliases = [{ from: '*', to: 'elsewhere/*' }];
    expect(resolveSpecifier(join(root, 'src/consumer.ts'), './value.js', aliases, root)).toBe(join(root, 'src/value.ts'));
    expect(resolveSpecifier(join(root, 'src/consumer.ts'), './dotted.helpers', aliases, root)).toBe(join(root, 'src/dotted.helpers.ts'));
  });

  it('(f) returns no aliases for absent, broken or invalid project config', () => {
    const root = project({});
    expect(readResolutionAliases(root)).toEqual([]);
    mkdirSync(join(root, '.filid'));
    const path = join(root, '.filid/config.json');
    for (const text of [
      '{broken',
      JSON.stringify({ resolution: { aliases: [{ from: '@app/*/utils', to: 'src/*' }] } }),
      JSON.stringify({ resolution: { aliases: [{ from: 'a**', to: 'b*' }] } }),
      JSON.stringify({ resolution: { aliases: [{ from: 'a*', to: 'b' }] } }),
      JSON.stringify({ resolution: { aliases: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }] } }),
      JSON.stringify({ resolution: { aliases: [{ from: '', to: 'b' }] } }),
      JSON.stringify({ resolution: { aliases: [null] } }),
    ]) {
      writeFileSync(path, text);
      expect(readResolutionAliases(root)).toEqual([]);
    }
  });
});
