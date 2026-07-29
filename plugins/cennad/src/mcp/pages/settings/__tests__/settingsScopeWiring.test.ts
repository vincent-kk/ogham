import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');
const HANDLERS_DIR = join(
  import.meta.dirname,
  '../../../tools/openSettings/webServer/handlers',
);

const readSettingsFile = (path: string) =>
  readFileSync(join(SETTINGS_DIR, path), 'utf8');

// The server states one half of this contract and the page the other. The page
// is a standalone browser script — nothing at build time connects the two, so
// this spec is what keeps them from drifting apart. Contract:
// cross-platform DETAIL.md "설정 페이지 계약".
describe('per-layer prefill wiring between the settings server and its page', () => {
  it('injects one normalized document per layer under the key the page reads', () => {
    const handler = readFileSync(
      join(HANDLERS_DIR, 'handleGetRoot.ts'),
      'utf8',
    );
    const app = readSettingsFile('scripts/app.js');

    expect(handler).toContain('configByScope');
    expect(handler).toContain('ctx.loadConfigByScope()');
    expect(app).toContain('raw.configByScope');
  });

  it('re-seats the form when the scope toggle moves', () => {
    const app = readSettingsFile('scripts/app.js');

    // Without this the toggle renamed the layer while the fields kept showing
    // the other one's values — the state the request called "위치에 의존하지
    // 않는" form.
    const handler = app.slice(
      app.indexOf("radio.addEventListener('change'"),
      app.indexOf('var text = document.createElement'),
    );
    expect(handler).toContain('applyScopeConfig()');
  });

  it('does not assemble a layer document in the page', () => {
    const app = readSettingsFile('scripts/app.js');

    // The page has neither the schema nor the defaults. Reading a raw layer
    // out of the scope state would make it guess both.
    expect(app).not.toMatch(/scopeState\.layers\[\s*scope\s*\]/);
  });
});
