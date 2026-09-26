import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { verifyRequiredTests } from '../verifyRequiredTests.mjs';

/** Exercise the runner with real file/report I/O and an isolated child adapter. */
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'maencof-required-'));
  try {
    await writeFile(join(root, 'present.test.ts'), '');
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Write a Vitest-shaped report without invoking a second test framework. */
function child(statuses = ['passed'], exitCode = 0, nameOverride) {
  return async (_command, args, options) => {
    const report = args
      .find((value) => value.startsWith('--outputFile='))
      .slice(13);
    await writeFile(
      report,
      JSON.stringify({
        testResults: [
          {
            name: nameOverride ?? join(options.cwd, args[1]),
            assertionResults: statuses.map((status) => ({ status })),
          },
        ],
      }),
    );
    return exitCode;
  };
}

test('accepts each exact file with passed assertions', () =>
  fixture(async (root) => {
    await verifyRequiredTests(['present.test.ts'], { root, run: child() });
  }));

test('missing first file cannot be hidden by a later successful file', () =>
  fixture(async (root) => {
    await assert.rejects(
      verifyRequiredTests(['missing.test.ts', 'present.test.ts'], {
        root,
        run: child(),
      }),
      /missing/i,
    );
  }));

for (const status of ['skipped', 'pending', 'todo', 'failed']) {
  test(`rejects ${status} assertions`, () =>
    fixture(async (root) => {
      await assert.rejects(
        verifyRequiredTests(['present.test.ts'], {
          root,
          run: child([status]),
        }),
        /assertion/i,
      );
    }));
}

test('rejects zero assertions', () =>
  fixture(async (root) => {
    await assert.rejects(
      verifyRequiredTests(['present.test.ts'], { root, run: child([]) }),
      /assertion/i,
    );
  }));
test('rejects another file result', () =>
  fixture(async (root) => {
    await assert.rejects(
      verifyRequiredTests(['present.test.ts'], {
        root,
        run: child(['passed'], 0, '/other.test.ts'),
      }),
      /result/i,
    );
  }));
test('rejects child failure despite passing JSON', () =>
  fixture(async (root) => {
    await assert.rejects(
      verifyRequiredTests(['present.test.ts'], {
        root,
        run: child(['passed'], 1),
      }),
      /exit/i,
    );
  }));
test('rejects missing or malformed reports', () =>
  fixture(async (root) => {
    for (const contents of ['', '{}']) {
      await assert.rejects(
        verifyRequiredTests(['present.test.ts'], {
          root,
          run: async (_command, args) => {
            await writeFile(
              args.find((arg) => arg.startsWith('--outputFile=')).slice(13),
              contents,
            );
            return 0;
          },
        }),
      );
    }
  }));
