import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

const pluginRoot = fileURLToPath(new URL('../../../', import.meta.url));

/** Election text belongs to `hooks/setup/render/`; a match here means a constants file stopped shaking. */
const ELECTION_FREE_BUNDLES = [
  'user-prompt-submit',
  'post-tool-use',
  'subagent-start',
];

describe('hook bundle isolation (built bridge)', () => {
  it.each(ELECTION_FREE_BUNDLES)(
    '%s carries no Election text on either host',
    (name) => {
      for (const host of ['claude', 'codex']) {
        const source = readFileSync(
          portableJoin(pluginRoot, 'bridge', host, `${name}.mjs`),
          'utf8',
        );
        expect(source).not.toMatch(/Election/);
      }
    },
  );

  it("post-tool-use carries no 'A plan was produced' text on either host", () => {
    for (const host of ['claude', 'codex']) {
      const source = readFileSync(
        portableJoin(pluginRoot, 'bridge', host, 'post-tool-use.mjs'),
        'utf8',
      );
      expect(source).not.toMatch(/A plan was produced/);
    }
  });
});
