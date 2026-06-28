import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');
const readSettingsFile = (path: string) =>
  readFileSync(join(SETTINGS_DIR, path), 'utf8');

describe('settings page ratio controls', () => {
  it('uses one shared ratio bar instead of per-provider sliders', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');
    const css = readSettingsFile('styles/styles.css');

    expect(html).toContain('id="ratio-bar"');
    expect(html).not.toContain('id="ratio-codex"');
    expect(html).not.toContain('id="ratio-antigravity"');
    expect(html).not.toContain('id="ratio-claude"');
    expect(app).toContain('renderRatioHandles');
    expect(css).toContain('.ratio-bar-segment');
  });

  it('preserves configured relative ratios after provider status loads', () => {
    const app = readSettingsFile('scripts/app.js');
    const statusFunction = app.match(
      /async function fetchProviderStatus\(\) \{[\s\S]*?\n {2}\}/,
    );

    expect(statusFunction).not.toBeNull();
    expect(statusFunction?.[0]).not.toContain('distributeEvenly()');
    expect(statusFunction?.[0]).toContain('renderRatio()');
  });

  it('keeps claude permission choices to headless-safe modes', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');

    expect(html).not.toContain('value="default"');
    expect(html).not.toContain('value="plan"');
    expect(html).toContain('value="dontAsk"');
    expect(app).toContain("permission_mode: 'dontAsk'");
    expect(app).toContain("'acceptEdits'");
    expect(app).toContain("'auto'");
    expect(app).toContain("'bypassPermissions'");
  });

  it('lays out claude tier model and effort controls on one row', () => {
    const css = readSettingsFile('styles/styles.css');

    expect(css).toContain(".tier-field[data-layout='model-effort']");
    expect(css).toContain('grid-template-columns: minmax(52px, auto) 1fr 1fr');
  });
});
