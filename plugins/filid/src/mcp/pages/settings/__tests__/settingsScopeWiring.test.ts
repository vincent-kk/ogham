import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');

const readSettingsFile = (path: string): string =>
  readFileSync(join(SETTINGS_DIR, path), 'utf8');

// The page is a standalone browser script — nothing at build time connects it
// to the state the server injects. Contract: cross-platform DETAIL.md
// "설정 페이지 계약".
describe('per-layer values in the settings page', () => {
  it('seats every config-backed field from the layer the toggle names', () => {
    const app = readSettingsFile('scripts/app.js');

    expect(app).toContain('state.configByScope');
    expect(app).toContain('function activeConfig()');
    // The merged config is no longer a page-wide source: reading it left the
    // User tab showing values the project layer had overridden.
    expect(app).not.toMatch(/state\.config\b(?!Exists|ByScope|Diagnostics)/);
  });

  it('starts the save document from the chosen layer, not the merge', () => {
    const app = readSettingsFile('scripts/app.js');

    // Saving under User from the merged document would write the project's
    // overrides into the user file — the layers would stop being separable.
    const collect = app.slice(
      app.indexOf('function collectConfig()'),
      app.indexOf('function collectRuleDocs()'),
    );
    expect(collect).toContain('JSON.stringify(activeConfig())');
  });

  it('redraws the form when the scope toggle moves', () => {
    const app = readSettingsFile('scripts/app.js');

    const handler = app.slice(
      app.indexOf("radio.addEventListener('change'"),
      app.indexOf('var text = document.createElement'),
    );
    expect(handler).toContain('applyScopeConfig()');
    expect(handler).toContain('renderRuleDocs()');
  });
});
