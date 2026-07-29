import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  portableDirname as dirname,
  portableJoin as join,
} from '@ogham/cross-platform/paths';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../../adapters/index.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import { createDefaultConfig } from '../../infra/configLoader/index.js';
import { createProjectSnapshot } from '../../projectSnapshot/index.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import { resolveContext } from '../index.js';

const roots: string[] = [];
let root: string;

function write(relativePath: string, content: string): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

function intent(name: string): string {
  return [
    `# ${name}`,
    '## Purpose',
    `Own ${name}.`,
    '## Structure',
    'The module entry point declares the public surface.',
    '## Conventions',
    'Prefer exact evidence.',
    '## Boundaries',
    '### Always do',
    '- Preserve the contract.',
    '### Ask first',
    '- Ask before changing the boundary.',
    '### Never do',
    '- Never return document bodies.',
    '## Dependencies',
    '- None.',
  ].join('\n');
}

function detail(name: string, marker: string): string {
  return [
    `# ${name} contract`,
    '## Requirements',
    `- ${marker}`,
    '## API Contracts',
    '- The contract is stable.',
    '## Acceptance Criteria',
    `### AC-${name} — stable evidence`,
    '- The documented behavior is available.',
    '## Last Updated',
    '2026-07-27',
  ].join('\n');
}

function writeContextProject(): {
  empty: string;
  feature: string;
  nested: string;
  nestedTarget: string;
  organTarget: string;
} {
  write('INTENT.md', intent('root'));
  write('DETAIL.md', detail('root', 'ROOT_DETAIL_BODY_MUST_NOT_LEAK'));
  write('index.ts', "export { feature } from './feature/index.js';");

  const feature = join(root, 'feature');
  write('feature/INTENT.md', intent('feature'));
  write(
    'feature/DETAIL.md',
    detail('feature', 'FEATURE_DETAIL_BODY_MUST_NOT_LEAK'),
  );
  write('feature/index.ts', "export { feature } from './feature.js';");
  write('feature/feature.ts', 'export const feature = true;');
  const organTarget = write(
    'feature/utils/format.ts',
    'export const format = String;',
  );

  const nested = join(root, 'feature/utils/nested');
  write('feature/utils/nested/INTENT.md', intent('nested'));
  write(
    'feature/utils/nested/DETAIL.md',
    detail('nested', 'NESTED_DETAIL_BODY_MUST_NOT_LEAK'),
  );
  write(
    'feature/utils/nested/index.ts',
    "export { nested } from './nested.js';",
  );
  const nestedTarget = write(
    'feature/utils/nested/nested.ts',
    'export const nested = true;',
  );

  const empty = join(root, 'empty');
  write('empty/INTENT.md', intent('empty'));
  write('empty/index.ts', "export { empty } from './empty.js';");
  write('empty/empty.ts', 'export const empty = true;');

  return { empty, feature, nested, nestedTarget, organTarget };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-context-resolver-'));
  roots.push(root);
});

afterEach(() => {
  for (const path of roots.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe('context resolver', () => {
  it('resolves an organ file to its closest owning fractal', async () => {
    const fixture = writeContextProject();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean'),
    );

    const resolution = resolveContext(snapshot, fixture.organTarget);

    expect(resolution.ownerFractalPath).toBe(fixture.feature);
    expect(resolution.chain.map(({ fractalPath }) => fractalPath)).toEqual([
      fixture.feature,
      root,
    ]);
  });

  it('preserves a nested fractal boundary beneath an organ', async () => {
    const fixture = writeContextProject();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean'),
    );

    const resolution = resolveContext(snapshot, fixture.nestedTarget);

    expect(resolution.ownerFractalPath).toBe(fixture.nested);
    expect(resolution.chain.map(({ fractalPath }) => fractalPath)).toEqual([
      fixture.nested,
      fixture.feature,
      root,
    ]);
    expect(resolution.nearestDetailPath).toBe(
      join(fixture.nested, 'DETAIL.md'),
    );
  });

  it('selects the first available DETAIL in the owner-to-root chain', async () => {
    const fixture = writeContextProject();
    const target = join(fixture.empty, 'empty.ts');
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean'),
    );

    const resolution = resolveContext(snapshot, target);

    expect(resolution.chain[0]).toMatchObject({
      fractalPath: fixture.empty,
      detailPath: null,
      documentStatus: 'missing',
    });
    expect(resolution.nearestDetailPath).toBe(join(root, 'DETAIL.md'));
  });

  it('returns document references and line evidence without document bodies', async () => {
    const fixture = writeContextProject();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean'),
    );

    const resolution = resolveContext(snapshot, fixture.nestedTarget);

    expect(resolution.chain[0]).toMatchObject({
      intentPath: join(fixture.nested, 'INTENT.md'),
      detailPath: join(fixture.nested, 'DETAIL.md'),
      documentStatus: 'valid',
    });
    expect(resolution.chain[0].intentLines).toBeGreaterThan(0);
    expect(JSON.stringify(resolution)).not.toContain(
      'NESTED_DETAIL_BODY_MUST_NOT_LEAK',
    );
  });

  it('returns the snapshot output language without rereading config', async () => {
    const fixture = writeContextProject();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('한국어'),
    );

    expect(resolveContext(snapshot, fixture.organTarget).outputLanguage).toBe(
      '한국어',
    );
  });

  it('rejects a target outside the project instead of falling back to root', async () => {
    writeContextProject();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('Korean'),
    );
    const outside = join(dirname(root), 'outside.ts');

    expect(() => resolveContext(snapshot, outside)).toThrow(
      /outside|project root/i,
    );
  });

  it('resolves Windows snapshot paths independently of the host OS', () => {
    const projectRoot = String.raw`C:\Project`;
    const feature = 'c:/project/feature';
    const tree = buildFractalTree([
      {
        path: projectRoot,
        name: 'project',
        type: 'fractal',
        hasIntentMd: true,
        hasDetailMd: true,
      },
      {
        path: feature,
        name: 'feature',
        type: 'fractal',
        hasIntentMd: true,
        hasDetailMd: true,
      },
    ]);
    for (const node of tree.nodes.values())
      node.documentEvidence = {
        intentPath: join(node.path, 'INTENT.md'),
        detailPath: join(node.path, 'DETAIL.md'),
        intentLines: 12,
        status: 'valid',
        findings: [],
      };
    const snapshot: ProjectSnapshot = {
      schemaVersion: 1,
      projectRoot,
      outputLanguage: 'Korean',
      snapshotHash: 'fixture',
      tree,
      dependencyGraph: {
        nodePaths: [projectRoot, feature],
        edges: [],
        cycles: [],
        certainty: 'exact',
      },
      adapterIds: [],
      verification: { files: [], violations: [], certainty: 'exact' },
      legacyCriteriaLedger: null,
      diagnostics: [],
      collectedAxes: ALL_SNAPSHOT_AXES,
      createdAt: '2026-07-27T00:00:00.000Z',
    };

    expect(
      resolveContext(snapshot, String.raw`C:\PROJECT\feature\source.ts`),
    ).toMatchObject({
      ownerFractalPath: feature,
      chain: [{ fractalPath: feature }, { fractalPath: projectRoot }],
    });
  });
});
