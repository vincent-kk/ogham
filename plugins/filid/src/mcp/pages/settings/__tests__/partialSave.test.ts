import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { expect, it, vi } from 'vitest';

it.each(['deployment', 'retirement'])(
  'keeps a partially applied save open and shows physical failure details',
  async (phase) => {
    const source = readFileSync(
      join(import.meta.dirname, '../scripts/app.js'),
      'utf8',
    );
    const code = source.slice(
      source.indexOf('function doSave('),
      source.indexOf('  renderScope();', source.indexOf('function doSave(')),
    );
    const setStatus = vi.fn();
    const close = vi.fn();
    const failure = {
      applied: ['/written'],
      failed: { target: '/failed', error: 'disk full' },
      notAttempted: ['/later'],
      backupPaths: ['/failed.bak'],
    };
    const context = {
      clearErrors: vi.fn(),
      collectConfig: () => ({}),
      saveCloseBtn: {},
      saveBtn: {},
      busy: vi.fn(),
      setStatus,
      scope: 'project',
      collectRuleDocs: () => ({}),
      post: async () => ({
        status: 200,
        json: async () => ({
          success: true,
          ruleDocs: {
            copied: ['done'],
            partial: [{ id: 'move', filename: 'move' }],
            ...(phase === 'deployment'
              ? { partialFailures: [failure] }
              : {
                  otherScope: {
                    scope: 'user',
                    filenames: [],
                    partialFailures: [failure],
                  },
                }),
          },
        }),
      }),
      window: { close },
      setTimeout: (callback: () => void) => callback(),
      saved: false,
      dirty: true,
    };
    runInNewContext(code + ';doSave(true)', context);
    await vi.waitFor(() =>
      expect(setStatus).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Partial'),
      ),
    );
    expect(setStatus.mock.calls.at(-1)?.[1]).toContain('/failed');
    expect(setStatus.mock.calls.at(-1)?.[1]).toContain('/later');
    expect(setStatus.mock.calls.at(-1)?.[1]).toContain('/failed.bak');
    expect(close).not.toHaveBeenCalled();
  },
);
