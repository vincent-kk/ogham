import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');

const readSettingsFile = (path: string): string =>
  readFileSync(join(SETTINGS_DIR, path), 'utf8');

// The page is a standalone browser script — nothing at build time connects it
// to the state the server injects. This spec is what keeps the toggle honest
// about the layer it names. Contract: cross-platform DETAIL.md "설정 페이지
// 계약".
describe('per-layer values in the settings page', () => {
  it('reads the dial from the chosen layer, not the merged config', () => {
    const app = readSettingsFile('scripts/app.js');

    // `state.config` is the effective dial. Seating the form from it left
    // User showing the value the project layer had overridden.
    expect(app).toContain('function dialForScope()');
    expect(app).not.toMatch(/var intervention\s*=\s*\(state\.config/);
  });

  it('re-seats the dial and the rule selections when the layer changes', () => {
    const app = readSettingsFile('scripts/app.js');

    const useLayer = app.slice(
      app.indexOf('function useLayer()'),
      app.indexOf('var MARKS'),
    );
    expect(useLayer).toContain('seatLayer()');
    expect(useLayer).toContain('dialForScope()');
    expect(useLayer).toContain('renderDial()');
  });

  it('rebuilds the checkbox state per layer rather than carrying it across', () => {
    const app = readSettingsFile('scripts/app.js');

    // Each channel holds its own deployment. Reusing the maps ticked the
    // boxes of the layer the user had just left.
    const seat = app.slice(
      app.indexOf('function seatLayer()'),
      app.indexOf('var intervention'),
    );
    expect(seat).toContain('selections = {}');
    expect(seat).toContain('resync = {}');
  });
});
