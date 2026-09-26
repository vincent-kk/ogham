import { createHash } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import {
  portableDirname as dirname,
  portableJoin as join,
} from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../adapters/index.js';
import { createDefaultConfig } from '../../core/infra/configLoader/index.js';
import { createProjectSnapshot } from '../../core/projectSnapshot/index.js';
import { handleFacts } from '../../mcp/tools/facts/index.js';
import type { FactsStatusSummary } from '../../mcp/tools/facts/index.js';
import type { ProjectSnapshot } from '../../types/fractal.js';

import { seedFacts } from './helpers/seedFacts.js';
import { FIXTURE_INTENT } from './reviewFlow/helpers/reviewFlowRepositoryFiles.js';

/** Temporary project roots removed after each case. */
const roots: string[] = [];

/** One fractal at the root, one child fractal, one verification file. */
const PROJECT: Readonly<Record<string, string>> = {
  'package.json': '{"name":"facts-evidence","type":"module"}\n',
  'INTENT.md': FIXTURE_INTENT,
  'index.ts': "export { helper } from './lib/index.js';\n",
  'lib/INTENT.md': FIXTURE_INTENT,
  'lib/index.ts': "export { helper } from './helper.js';\n",
  'lib/helper.ts': 'export const helper = 1;\n',
  'lib/broken.ts': "export { gone } from './gone.js';\n",
  '__tests__/helper.test.ts':
    "import '../lib/helper.js';\nit('holds', () => {});\n",
};

/**
 * Write one project tree under a fresh temporary root.
 * @param files Project-relative path to content.
 * @returns The absolute root.
 */
function writeProject(
  files: Readonly<Record<string, string>> = PROJECT,
): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-facts-evidence-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content, 'utf8');
  }
  return root;
}

/**
 * Snapshot one project with the default registry.
 * @param root Absolute project root.
 * @param config Configuration override merged over the default.
 * @returns The snapshot.
 */
async function snapshot(
  root: string,
  config: Partial<ReturnType<typeof createDefaultConfig>> = {},
): Promise<ProjectSnapshot> {
  return createProjectSnapshot(root, createAdapterRegistry(), {
    ...createDefaultConfig(),
    ...config,
  });
}

/**
 * Every cause the graph attributes to one project-relative path.
 * @param result Snapshot to read.
 * @param path Project-relative POSIX path.
 * @returns The causes, or an empty list when the file is not unknown.
 */
function causesOf(result: ProjectSnapshot, path: string): readonly string[] {
  return (
    result.dependencyGraph.unknownFiles.find((file) => file.path === path)
      ?.causes ?? []
  );
}

/**
 * Replace one file's record with one that reports no optional section.
 *
 * A provider is allowed to omit `entrySurface` and `verification`; the record
 * still binds, so the file stays `exact` while one axis has nothing to read.
 * @param root Absolute project root.
 * @param path Project-relative POSIX path of the file to replace.
 */
async function submitSectionlessRecord(
  root: string,
  path: string,
): Promise<void> {
  const status = await handleFacts({ action: 'status', path: root });
  const bytes = readFileSync(join(root, path));
  const file = join(
    mkdtempSync(join(tmpdir(), 'filid-sectionless-')),
    'r.json',
  );
  writeFileSync(
    file,
    JSON.stringify([
      {
        schemaVersion: 1,
        path,
        contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        references: [],
        provenance: {
          tool: 'sectionless',
          version: '1',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [],
        },
      },
    ]),
  );
  await handleFacts({
    action: 'submit',
    path: root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('snapshot evidence comes from the facts store', () => {
  it('draws its edges from the stored records', async () => {
    const root = writeProject();
    await seedFacts(root);

    const result = await snapshot(root);

    expect(result.dependencyGraph.unknownFiles).toEqual([
      { path: 'lib/broken.ts', causes: ['unresolved-local-dependency'] },
    ]);
    expect(
      result.dependencyGraph.edges.map(
        ({ fromFractalPath, toFractalPath }) =>
          `${fromFractalPath} -> ${toFractalPath}`,
      ),
    ).toContain(`${root} -> ${join(root, 'lib')}`);
  });

  it('drops the edges of a file whose record no longer binds, without asking an adapter', async () => {
    const root = writeProject();
    await seedFacts(root);
    appendFileSync(join(root, 'lib', 'index.ts'), '// changed\n');

    const result = await snapshot(root);

    expect(causesOf(result, 'lib/index.ts')).toEqual(['facts-missing']);
    expect(
      result.dependencyGraph.edges.flatMap(({ evidence }) =>
        evidence.map(({ sourceFile }) => sourceFile),
      ),
    ).not.toContain(join(root, 'lib', 'index.ts'));
  });

  it('attributes an unresolved reference of an exact file to that file', async () => {
    const root = writeProject();
    await seedFacts(root);

    const result = await snapshot(root);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-local-dependency',
        path: join(root, 'lib', 'broken.ts'),
        specifier: './gone.js',
      }),
    );
    expect(causesOf(result, 'lib/broken.ts')).toEqual([
      'unresolved-local-dependency',
    ]);
  });

  it('counts the source files the scope drops instead of passing them in silence', async () => {
    const root = writeProject();

    const narrowed = await snapshot(root, { facts: { covers: ['index.ts'] } });
    const whole = await snapshot(root);

    // A count, not a diagnostic: it changes no conclusion, and a report every
    // project always carries teaches its reader to skip the real ones.
    // The four source files the narrowed scope drops; the manifest and the two
    // INTENT.md documents are outside the default scope too, and no
    // reference-based rule was ever going to read them.
    expect(narrowed.filesOutsideFactsScope).toBe(4);
    // Declaring nothing drops nothing: the default scope is the declaration.
    expect(whole.filesOutsideFactsScope).toBe(0);
    expect(narrowed.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'dependency-files-out-of-scope' }),
    );
  });

  it('answers an empty declared scope with facts-uninitialized, not a pass', async () => {
    const root = writeProject();

    const result = await snapshot(root, { facts: { covers: [] } });

    expect(result.dependencyGraph.certainty).toBe('unsupported');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'facts-uninitialized' }),
    );
  });

  it('keeps its reference evidence when no structure adapter is active', async () => {
    const root = writeProject();
    await seedFacts(root);

    const result = await snapshot(root, {
      adapters: { mode: 'explicit', enabled: [] },
    });

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'dependency-adapter-unavailable' }),
    );
    expect(result.dependencyGraph.edges.length).toBeGreaterThan(0);
  });

  it('reads an entry point surface from the record that describes it', async () => {
    const root = writeProject();
    await seedFacts(root);

    const result = await snapshot(root);

    expect(
      result.tree.nodes
        .get(join(root, 'lib'))
        ?.entryPointSurfaces?.map(({ exportedNames, certainty }) => ({
          exportedNames,
          certainty,
        })),
    ).toEqual([{ exportedNames: ['helper'], certainty: 'exact' }]);
  });

  it('leaves an entry point surface indeterminate while no record describes it', async () => {
    const root = writeProject();

    const result = await snapshot(root);

    expect(
      result.tree.nodes
        .get(join(root, 'lib'))
        ?.entryPointSurfaces?.map(({ certainty }) => certainty),
    ).toEqual(['indeterminate']);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'entry-point-facts-unavailable',
        path: join(root, 'lib', 'index.ts'),
      }),
    );
  });

  it('reads a verification role and case count from the record', async () => {
    const root = writeProject();
    await seedFacts(root);

    const result = await snapshot(root);

    expect(
      result.verification.files.map(({ path, role, count }) => ({
        path,
        role,
        exactCount: count.exactCount,
      })),
    ).toEqual([
      {
        path: join(root, '__tests__', 'helper.test.ts'),
        role: 'test-record',
        exactCount: 1,
      },
    ]);
    expect(result.verification.certainty).toBe('exact');
  });

  it('leaves verification indeterminate while no record describes a discovered file', async () => {
    const root = writeProject();

    const result = await snapshot(root);

    expect(result.verification.files).toEqual([]);
    expect(result.verification.certainty).toBe('indeterminate');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'verification-facts-unavailable',
        path: join(root, '__tests__', 'helper.test.ts'),
      }),
    );
  });

  it('demands no record for a verification file the scan excludes', async () => {
    const test = "it('holds', () => {});\n";
    const root = writeProject({
      ...PROJECT,
      'skills/a.test.ts': test,
      '.metadata/b.test.ts': test,
      'scripts/c.test.ts': test,
    });
    const defaults = createDefaultConfig();

    const result = await snapshot(root, {
      structure: {
        ...defaults.structure,
        additionalExcludedDirectories: ['skills'],
      },
    });

    const unavailable = result.diagnostics
      .filter(({ code }) => code === 'verification-facts-unavailable')
      .map(({ path }) => path);
    // A scan-excluded path is refused by facts submit, so a demand for its
    // record would be a blocker no action clears.
    expect(unavailable).toEqual([join(root, '__tests__', 'helper.test.ts')]);
  });
});

describe('the snapshot resolves its root once', () => {
  it('draws the same edges when the caller spells the root relatively', async () => {
    const root = writeProject();
    await seedFacts(root);
    const absolute = await snapshot(root);

    const previous = process.cwd();
    process.chdir(root);
    try {
      const relative = await createProjectSnapshot(
        '.',
        createAdapterRegistry(),
        createDefaultConfig(),
      );
      // Every path the collectors build hangs off one resolved root; a second
      // spelling would leave every edge without an owner.
      expect(relative.dependencyGraph.edges.length).toBe(
        absolute.dependencyGraph.edges.length,
      );
      expect(relative.dependencyGraph.unknownFiles).toEqual(
        absolute.dependencyGraph.unknownFiles,
      );
    } finally {
      process.chdir(previous);
    }
  });
});

describe('a diagnostic names the step that ends it', () => {
  it('does not send an exact record with no section back to the bootstrap', async () => {
    // Files with no references of their own: replacing their records drops no
    // edge, so they stay `exact` with one section missing.
    const root = writeProject({
      'package.json': '{"name":"sectionless","type":"module"}\n',
      'INTENT.md': FIXTURE_INTENT,
      'index.ts': 'export const value = 1;\n',
      '__tests__/value.test.ts': "it('holds', () => {});\n",
    });
    await seedFacts(root);
    await submitSectionlessRecord(root, 'index.ts');
    await submitSectionlessRecord(root, '__tests__/value.test.ts');

    const result = await snapshot(root);

    // `facts status` lists only missing and stale files, so a record that
    // binds but reports no section would never be re-extracted by a bootstrap.
    for (const code of [
      'entry-point-facts-unavailable',
      'verification-facts-unavailable',
    ]) {
      const diagnostic = result.diagnostics.find(
        (entry) => entry.code === code,
      );
      expect(diagnostic?.nextAction).not.toContain('facts status');
      expect(diagnostic?.nextAction).toContain('positional arguments');
    }
  });

  it('sends an entry point outside the declared scope to facts.covers', async () => {
    const root = writeProject();

    const result = await snapshot(root, { facts: { covers: ['nothing/**'] } });

    expect(
      result.diagnostics.find(
        (entry) => entry.code === 'entry-point-facts-unavailable',
      )?.nextAction,
    ).toContain('facts.covers');
  });
});
