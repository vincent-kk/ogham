import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin as join } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import {
  classifyProjectFacts,
  readProjectFacts,
} from '../../core/facts/index.js';
import { loadConfig } from '../../core/infra/configLoader/index.js';

import { seedFacts } from './helpers/seedFacts.js';

/** Workspaces removed after each case. */
const workspaces: string[] = [];

/**
 * A project reachable under two spellings: through a symbolic link and not.
 * @returns Both absolute paths, or null when this platform refuses the link.
 */
function projectReachedTwoWays(): { real: string; linked: string } | null {
  const workspace = mkdtempSync(join(tmpdir(), 'filid-store-identity-'));
  workspaces.push(workspace);
  const real = join(workspace, 'real');
  mkdirSync(join(real, 'src'), { recursive: true });
  writeFileSync(join(real, 'src', 'index.ts'), "export const value = 1;\n");
  const linked = join(workspace, 'linked');
  try {
    symlinkSync(real, linked, 'dir');
  } catch {
    return null;
  }
  return { real, linked };
}

/**
 * The facts state of every scanned file, read under one spelling of the root.
 * @param root Absolute project root, as the caller spells it.
 * @returns Each project-relative path mapped to its state.
 */
async function statesUnder(root: string): Promise<[string, string][]> {
  const facts = await readProjectFacts(root, loadConfig(root).config ?? undefined);
  return [...classifyProjectFacts(root, facts)];
}

afterEach(() => {
  for (const workspace of workspaces.splice(0))
    rmSync(workspace, { recursive: true, force: true });
});

describe('one project has one facts store, whatever its path is spelled like', () => {
  it.for([
    ['submitted through the link', 'linked', 'real'],
    ['submitted through the real path', 'real', 'linked'],
  ] as const)('is read back after being %s', async ([, from, to], { skip }) => {
    const paths = projectReachedTwoWays();
    if (paths === null) {
      skip('this platform does not allow creating a symbolic link');
      return;
    }

    await seedFacts(paths[from]);

    expect(await statesUnder(paths[to])).toEqual([['src/index.ts', 'exact']]);
    expect(await statesUnder(paths[from])).toEqual([['src/index.ts', 'exact']]);
  });
});
