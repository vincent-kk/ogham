import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');
const readSettingsFile = (path: string) =>
  readFileSync(join(SETTINGS_DIR, path), 'utf8');

describe('settings page ratio bar', () => {
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

  // The bar divides providers in PROVIDERS order, so a card order that drifts
  // from it silently renumbers the segments under the cards.
  it('divides the bar in the same order the provider cards appear', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');

    const cardOrder = [...html.matchAll(/id="toggle-([a-z]+)"/g)].map(
      (match) => match[1],
    );
    const declared = app.match(/var PROVIDERS = \[([^\]]+)\]/);
    const listOrder = [...(declared?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map(
      (match) => match[1],
    );

    expect(cardOrder).toHaveLength(3);
    expect(listOrder).toEqual(cardOrder);
  });

  // A handle used to be appended beside the segments, which made it :last-child
  // and squared off the segment at the end of the bar. Segments are clipped by
  // the track now, so no segment carries corner rules at all.
  it('shapes segments by clipping them in the track, not by DOM position', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');
    const css = readSettingsFile('styles/styles.css');

    expect(html).toContain('id="ratio-bar-track"');
    expect(app).toContain('ratioBarTrack.appendChild(segment)');
    expect(css).toContain('overflow: hidden');
    expect(css).not.toMatch(/\.ratio-bar-segment:(first|last)-child/);
  });

  // Shading used to be keyed by provider name, so reordering the cards left the
  // bar reading dark → light → mid. Position owns the shade; the provider does not.
  it('shades segments by bar position, darkening left to right', () => {
    const app = readSettingsFile('scripts/app.js');
    const css = readSettingsFile('styles/styles.css');

    expect(app).toContain("segment.setAttribute('data-rank'");
    expect(css).not.toMatch(/\.ratio-bar-segment\[data-provider=/);

    const shades = [
      ...css.matchAll(
        /\.ratio-bar-segment\[data-rank='(\d)'\][^}]*var\(--fg\) (\d+)%/g,
      ),
    ].map((match) => [Number(match[1]), Number(match[2])]);

    expect(shades.map((shade) => shade[0])).toEqual([0, 1, 2]);
    expect(shades[0][1]).toBeGreaterThan(shades[1][1]);
    expect(shades[1][1]).toBeGreaterThan(shades[2][1]);
  });

  it('preserves configured relative ratios after provider status loads', () => {
    const app = readSettingsFile('scripts/app.js');
    const statusFunction = app.match(
      /async function fetchProviderStatus\(\) \{[\s\S]*?\n {2}\}/,
    );

    expect(statusFunction).not.toBeNull();
    expect(statusFunction?.[0]).not.toContain('distributeEvenly()');
    expect(statusFunction?.[0]).not.toContain('ratioState[p].enabled = false');
    expect(statusFunction?.[0]).toContain('renderRatio()');
  });
});
