import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SETTINGS_DIR = join(import.meta.dirname, '..');
const readSettingsFile = (path: string) =>
  readFileSync(join(SETTINGS_DIR, path), 'utf8');

// The ratio bar has its own spec: settingsRatioBar.test.ts
describe('settings page provider controls', () => {
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

  // apex is a tier like any other here: the user may map it to whatever model and
  // effort they want, so every provider carries the same four rows.
  it('offers per-tier model and effort controls for all four tiers', () => {
    const html = readSettingsFile('index.html');

    for (const provider of ['codex', 'antigravity', 'claude'])
      for (const tier of ['apex', 'high', 'mid', 'low']) {
        expect(html).toContain(`id="model-${provider}-${tier}"`);
        expect(html).toContain(`id="effort-${provider}-${tier}"`);
        expect(html).toContain(`name="default-tier-${provider}"`);
      }
  });

  it('exposes liveness limits as one idle timer plus a ceiling per tier', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');

    expect(html).toContain('id="idle-timeout-min"');
    for (const tier of ['apex', 'high', 'mid', 'low'])
      expect(html).toContain(`id="hard-cap-${tier}"`);
    expect(html).not.toContain('id="spawn-timeout-ms"');
    expect(app).toContain("var TIERS = ['apex', 'high', 'mid', 'low']");
    expect(app).toContain('timeouts: buildTimeouts()');
  });

  // The limits are the kind of setting nobody should have to fill in: collapsed
  // by default, with the effective values readable without opening the panel.
  it('keeps the limits collapsed behind a summary of their current values', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');
    const css = readSettingsFile('styles/styles.css');

    expect(html).toContain('<details class="limits">');
    expect(html).not.toMatch(/<details class="limits" open/);
    expect(html).toContain('id="limits-summary"');
    expect(app).toContain('function renderTimeoutSummary(');
    expect(css).toContain('.limits-summary');
  });

  it('strips spinner controls from number inputs', () => {
    const css = readSettingsFile('styles/styles.css');

    expect(css).toContain("input[type='number']::-webkit-inner-spin-button");
    expect(css).toContain('appearance: textfield');
  });

  // agy embeds the variant in the model name; the UI splits it into a model + a
  // per-model effort dropdown so config stores {model, effort} like codex/claude.
  it('splits agy models into model + effort and scopes effort to the model', () => {
    const app = readSettingsFile('scripts/app.js');

    expect(app).toContain('function parseAgyModel(');
    expect(app).toContain('function agyEffortSet(');
    expect(app).toContain('bindAgyEffortOptions(tier, model)');
  });

  // `agy models` lists slugs with the variant appended, so the page must split
  // those too — otherwise every slug lands whole in the model dropdown and every
  // effort select reads "(no effort)". The vocabulary is duplicated across the
  // language boundary, so both copies are pinned here.
  it('splits catalog slugs into model + effort using the shared variant list', () => {
    const app = readSettingsFile('scripts/app.js');
    const constants = readFileSync(
      join(SETTINGS_DIR, '../../../constants/agyModels.ts'),
      'utf8',
    );

    const declared = app.match(/var AGY_VARIANT_SUFFIXES = \[([^\]]+)\]/);
    const pageList = [...(declared?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map(
      (match) => match[1],
    );
    const sharedList = [
      ...constants
        .slice(constants.indexOf('AGY_VARIANT_SUFFIXES'))
        .matchAll(/'([a-z]+)'/g),
    ].map((match) => match[1]);

    expect(pageList).toEqual(['high', 'medium', 'low', 'thinking']);
    expect(sharedList).toEqual(pageList);
    expect(app).toContain('name.slice(-suffix.length) === suffix');
  });

  // `clampEffort` ranks the stored effort against AGY_EFFORT_SCALE. A catalog whose
  // variants the scale does not spell — `agy models` prints them lowercase — makes
  // every lookup miss, so a model switch silently lands on the catalog's last
  // variant instead of keeping the level the user chose.
  it('spells every parsed agy variant the way the effort scale does', () => {
    const app = readSettingsFile('scripts/app.js');
    const levels = [
      ...(app.match(/var AGY_EFFORT_SCALE = \[([^\]]+)\]/)?.[1] ?? '').matchAll(
        /'([A-Za-z]+)'/g,
      ),
    ].map((match) => match[1].toLowerCase());
    const suffixes = [
      ...(
        app.match(/var AGY_VARIANT_SUFFIXES = \[([^\]]+)\]/)?.[1] ?? ''
      ).matchAll(/'([a-z]+)'/g),
    ].map((match) => match[1]);

    expect(levels.length).toBeGreaterThan(0);
    expect(suffixes.length).toBeGreaterThan(0);
    for (const suffix of suffixes) expect(levels).toContain(suffix);
    expect(app).toContain('function canonicalAgyVariant(');
    expect(app).toContain('effort: canonicalAgyVariant(match[2])');
    expect(app).toContain(
      'effort: canonicalAgyVariant(AGY_VARIANT_SUFFIXES[i])',
    );
  });

  // The page is served from disk but the MCP server only reloads on restart, so a
  // freshly written config can meet an older dispatcher. Storing a bare base —
  // which agy rejects on its own ("requires --effort") — turns that skew into a
  // failed delegation, so the saved name must stand alone.
  it('saves an agy model name that is valid without a separate effort', () => {
    const app = readSettingsFile('scripts/app.js');
    const dispatcher = readFileSync(
      join(
        SETTINGS_DIR,
        '../../../dispatcher/antigravity/operations/modelAlias.ts',
      ),
      'utf8',
    );

    expect(app).toContain('function joinAgyName(');
    expect(app).toContain('antigravity[tier].model = joinAgyName(');
    // The variant now lives in the name only. Leaving `effort` beside it lets a
    // dispatcher from an older build append it again — that build joins whenever
    // effort is non-empty, with no completeness check.
    expect(app).toContain('delete antigravity[tier].effort');
    // Both joins branch on the same spelling test: space → " (Variant)", else "-variant".
    expect(app).toContain("name.indexOf(' ') !== -1");
    expect(dispatcher).toContain("model.includes(' ')");
  });

  // Two reasons disable the effort select and they need opposite handling: an
  // unreadable catalog keeps the user's stored effort, a variant-less model drops
  // it so dispatch cannot rebuild "<model>-high".
  it('keeps a stored agy effort only while the catalog says it can apply', () => {
    const app = readSettingsFile('scripts/app.js');

    expect(app).toContain('function keptAgyEffort(');
    expect(app).toContain('if (agyModels.length === 0)');
    expect(app).toContain('agyEffortSet(base).length > 0');
  });

  // codex hard-fails an effort its model does not advertise, so the effort list
  // must follow the selected model rather than offering the whole scale.
  it('scopes codex effort options to the selected model', () => {
    const app = readSettingsFile('scripts/app.js');

    expect(app).toContain('function codexEffortSet(');
    expect(app).toContain('CODEX_FALLBACK_MODEL_EFFORT_SETS');
    expect(app).toContain("'ultra'");
    expect(app).toContain(
      'bindCodexEffortOptions(tier, modelCodex[tier].value)',
    );
  });

  // The page hardcodes copies of the claude effort constants (it ships as static
  // JS and cannot import the TS source). Drift is silent — the UI would keep
  // offering a level the schema rejects, or hide one it accepts — so the two
  // copies are compared here rather than spot-checked for a name.
  it('mirrors the claude effort constants from src/constants/claudeModels.ts', () => {
    const app = readSettingsFile('scripts/app.js');
    const source = readFileSync(
      join(SETTINGS_DIR, '../../../constants/claudeModels.ts'),
      'utf8',
    );
    // `anchor` skips the TS type annotation — `readonly ClaudeEffort[]` carries a
    // bracket pair of its own, so the array has to be found by its assignment.
    const bracketAfter = (
      text: string,
      marker: string,
      anchor: string,
    ): string[] => {
      const from = text.indexOf(marker);
      const open = from < 0 ? -1 : text.indexOf(anchor, from);
      if (open < 0) return [];
      return [
        ...text.slice(open, text.indexOf(']', open)).matchAll(/'([a-z]+)'/g),
      ].map((match) => match[1]);
    };
    const levels = (text: string): string[] =>
      bracketAfter(text, 'CLAUDE_EFFORT_LEVELS', '= [');
    const effortSet = (text: string, alias: string): string[] =>
      bracketAfter(
        text.slice(text.indexOf('MODEL_EFFORT_SETS')),
        `${alias}:`,
        ': [',
      );

    expect(levels(app)).toEqual(levels(source));
    expect(levels(app)).toContain('ultracode');
    for (const alias of ['opus', 'sonnet', 'haiku'])
      expect(effortSet(app, alias), alias).toEqual(effortSet(source, alias));
  });

  it('describes user artifacts under the cennad data home', () => {
    const html = readSettingsFile('index.html');

    expect(html).toContain(
      '&lt;active cennad home&gt;/artifacts/&lt;projectHash&gt;/',
    );
    expect(html).toContain('~/.claude/plugins/cennad/');
    expect(html).toContain('CENNAD_CONFIG_PATH');
  });

  it('offers an opt-in Claude user MCP target for the YouTube addon', () => {
    const html = readSettingsFile('index.html');
    const app = readSettingsFile('scripts/app.js');

    expect(html).toContain('id="youtube-target-claude"');
    expect(app).toContain('claude: false');
    expect(app).toContain(
      "var youtubeTargetClaude = $('#youtube-target-claude')",
    );
    expect(app).toContain('claude: Boolean(youtubeTargetClaude.checked)');
    expect(app.indexOf('var youtubeTargetClaude')).toBeLessThan(
      app.indexOf('var youtubeTargetCodex'),
    );
    expect(app.indexOf('var youtubeTargetCodex')).toBeLessThan(
      app.indexOf('var youtubeTargetAntigravity'),
    );
  });
});
