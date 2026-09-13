import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');

it('uses the server initial scope without judging config layers', () => {
  const app = readFileSync(join(SETTINGS_DIR, 'scripts/app.js'), 'utf8');
  const declaration = app.match(/var scope = [^;]+;/)?.[0];
  expect(declaration).toBeDefined();
  for (const initialScope of ['project', 'user']) {
    const injected = { initialScope };
    expect(
      runInNewContext(declaration + 'scope', { state: injected, injected }),
    ).toBe(initialScope);
  }
});

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

  it('offers skills-only off as the visible default dial position', () => {
    const app = readSettingsFile('scripts/app.js');
    const dial = app.slice(
      app.indexOf('var DIAL_OPTIONS'),
      app.indexOf('// Which layer a save lands in.'),
    );

    expect((dial.match(/value:/g) || []).length).toBe(4);
    expect(app).toContain("var DIAL_OFF = 'off'");
    expect(dial).toContain('value: DIAL_OFF');
    expect(dial).toContain("label: 'Skills only'");
    expect(app).toMatch(/\|\|\s*(DIAL_OFF|'off')/);
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
