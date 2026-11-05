import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { expect, it, vi } from 'vitest';

it.each(['deployment', 'retirement'])(
  'keeps partial results visible without replacing them with a fresh preview',
  async (phase) => {
    const source = readFileSync(
      join(import.meta.dirname, '../scripts/app.js'),
      'utf8',
    );
    const code = source.slice(
      source.indexOf('function save('),
      source.indexOf('function closeWindow('),
    );
    const setStatus = vi.fn();
    const refreshPreview = vi.fn(async () => undefined);
    const closeWindow = vi.fn();
    const failure = {
      applied: ['/written'],
      failed: { target: '/failed', error: 'disk full' },
      notAttempted: ['/later'],
      backupPaths: ['/failed.bak'],
    };
    const context = {
      previewToken: 0,
      previewRevision: 'old',
      setBusy: vi.fn(),
      setStatus,
      ROUTE: { SAVE: '/save' },
      body: () => ({}),
      post: async () => ({
        ruleDocs: {
          applied: false,
          outcomes: [{ action: 'partial' }],
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
      renderPreview: vi.fn(),
      refreshPreview,
      closeWindow,
    };
    runInNewContext(code + ';save(true)', context);
    await vi.waitFor(() =>
      expect(setStatus).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Partial'),
      ),
    );
    expect(setStatus.mock.calls.at(-1)?.[1]).toContain('/failed');
    expect(setStatus.mock.calls.at(-1)?.[1]).toContain('/later');
    expect(setStatus.mock.calls.at(-1)?.[1]).toContain('/failed.bak');
    expect(refreshPreview).not.toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
  },
);

it('labels completed withdrawals as removed when retirement itself is partial', () => {
  const source = readFileSync(
    join(import.meta.dirname, '../scripts/app.js'),
    'utf8',
  );
  const code = source.slice(
    source.indexOf('function renderScopeMove('),
    source.indexOf('function syncSaveLabel('),
  );
  const text: string[] = [];
  const element = (_tag: string, _className: string, content?: string) => {
    if (content) text.push(content);
    return { appendChild: () => undefined, setAttribute: () => undefined };
  };
  const render = runInNewContext(code + ';renderScopeMove', {
    element,
    MARKS: { remove: '-' },
  });
  render({
    scope: 'user',
    displayTarget: '/old',
    filenames: ['done.md'],
    partialFailures: [{}],
  });
  expect(text.join(' ')).toContain('removed from the user layer');
  expect(text.join(' ')).not.toContain('still deployed');
});
