import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableRelative } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';

/** Source root; every import the program reaches is judged relative to it. */
const SOURCE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
/** The program's entry source. */
const ENTRY = `${SOURCE_ROOT}factsExtractor/factsExtractor.entry.ts`;
/** A bare call or an import that can start a process; a method call such as `RegExp#exec` is not one. */
const PROCESS_START =
  /(?<![.\w])(spawnCliSync|spawnSync|spawn|execFileSync|execFile|execSync|exec|fork)\s*\(|['"](node:)?child_process['"]/;
/** The one call the program may make: git, with the fixed argument constant. */
const FIXED_GIT_CALL =
  /spawnCliSync\('git', LIST_IGNORED_ARGUMENTS, \{\s*cwd: rootPath,\s*\}\)/;
/** Package names that would drag the server or a validation runtime into the bundle. */
const FORBIDDEN_PACKAGE = /from\s+['"](zod|@modelcontextprotocol\/[^'"]*)['"]/;

describe('the extractor stays out of the server', () => {
  it('reaches no core, mcp or hooks module, no zod or MCP SDK import, and starts only a fixed git call', async () => {
    const seen = new Set<string>();
    const pending = [ENTRY];
    while (pending.length > 0) {
      const file = pending.pop();
      if (!file || seen.has(file)) continue;
      seen.add(file);
      for (const reference of await ecmascriptStructureAdapter.extractDependencies(
        file,
      ))
        if (reference.resolvedPath) pending.push(reference.resolvedPath);
    }
    const reached = [...seen].map((path) =>
      portableRelative(SOURCE_ROOT, path).replaceAll('\\', '/'),
    );
    expect(reached.length).toBeGreaterThan(10);
    expect(reached.filter((path) => /^(core|mcp|hooks)\//.test(path))).toEqual(
      [],
    );
    expect(
      reached.filter((path) =>
        FORBIDDEN_PACKAGE.test(readFileSync(`${SOURCE_ROOT}${path}`, 'utf8')),
      ),
    ).toEqual([]);
    // Only --all's discovery asks git for ignored paths, with constant arguments:
    // no argv, list or file text becomes a command or an argument.
    const starters = reached.filter((path) =>
      PROCESS_START.test(readFileSync(`${SOURCE_ROOT}${path}`, 'utf8')),
    );
    expect(starters).toEqual(['lib/listGitIgnoredPaths.ts']);
    const gitCall = readFileSync(`${SOURCE_ROOT}${starters[0]}`, 'utf8');
    expect(gitCall).toMatch(FIXED_GIT_CALL);
    expect(gitCall).toMatch(
      /const LIST_IGNORED_ARGUMENTS = \[\s*('[^']*',\s*)+\];/,
    );
  });
});
