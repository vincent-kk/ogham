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
  it('seats the form from the layer the toggle names', () => {
    const app = readSettingsFile('scripts/app.js');

    expect(app).toContain('state.configByScope');
    expect(app).toContain('function applyScopeConfig()');
    expect(app).not.toMatch(/var config = state\.config\b/);
  });

  it('redraws the form when the scope toggle moves', () => {
    const app = readSettingsFile('scripts/app.js');

    const handler = app.slice(
      app.indexOf("radio.addEventListener('change'"),
      app.indexOf('var text = document.createElement'),
    );
    expect(handler).toContain('applyScopeConfig()');
  });

  it('populates the session-supplied project list only once', () => {
    const app = readSettingsFile('scripts/app.js');

    // The Jira project list belongs to the session bootstrap, not to either
    // layer. Redrawing it per toggle would stack duplicate <option> rows.
    const seat = app.slice(
      app.indexOf('function applyScopeConfig()'),
      app.indexOf(
        'applyScopeConfig();',
        app.indexOf('function applyScopeConfig()'),
      ),
    );
    expect(seat).not.toContain('populateProjectOptions');
    expect(app).toContain('(function populateProjectOptions()');
  });
});
