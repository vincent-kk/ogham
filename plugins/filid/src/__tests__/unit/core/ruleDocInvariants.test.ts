import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadRuleDocsManifest } from '../../../core/infra/configLoader/loaders/loadRuleDocsManifest.js';

/**
 * A mechanical drift guard on the shipped rule documents, NOT a quality test.
 * It checks only string-level and filesystem-level facts: that the manifest and
 * `templates/rules/` agree in both directions, that stored hashes are fresh
 * (`yarn build:rules` was run), and that every document carries the skeleton the
 * rules are written to — the precedence chain, the format-grounding sentence and
 * the double falsification. Whether a rule is sound is a semantic question this
 * file makes no claim about.
 *
 * Numeric thresholds are deliberately NOT banned here. Thresholds are filid's to
 * own; the sibling seiri guard bans them because they belong on this side.
 */
const packageRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const rulesDir = join(packageRoot, 'templates', 'rules');

/** The combined document the four current rules replaced. */
const RETIRED_DOC = 'filid_fca-policy.md';

const shippedFilenames = readdirSync(rulesDir)
  .filter((name) => name.endsWith('.md') && name !== 'README.md')
  .sort();

const shipped = shippedFilenames.map((name) => ({
  name,
  text: readFileSync(join(rulesDir, name), 'utf8'),
}));

describe('shipped rule documents', () => {
  it('ships exactly the four rules the manifest declares, all required', () => {
    const entries = loadRuleDocsManifest(packageRoot).rules;

    expect(entries.map((entry) => entry.filename).sort()).toEqual([
      'filid_code-placement.md',
      'filid_fractal-boundaries.md',
      'filid_module-documents.md',
      'filid_verification-records.md',
    ]);
    expect(entries.every((entry) => entry.required)).toBe(true);
  });

  it('agrees with the templates directory in both directions', () => {
    const declared = loadRuleDocsManifest(packageRoot)
      .rules.map((entry) => entry.filename)
      .sort();

    // A template with no entry is never deployed; an entry with no template is
    // skipped at sync time. Either way the mismatch is silent without this.
    expect(declared).toEqual(shippedFilenames);
    for (const filename of declared)
      expect(existsSync(join(rulesDir, filename))).toBe(true);
  });

  it('stores a template hash that matches every file — rebuild freshness', () => {
    const stale = loadRuleDocsManifest(packageRoot)
      .rules.filter(
        (entry) =>
          createHash('sha256')
            .update(readFileSync(join(rulesDir, entry.filename)))
            .digest('hex') !== entry.templateHash,
      )
      .map((entry) => entry.filename);

    expect(stale).toEqual([]);
  });

  it('no longer ships or declares the retired combined document', () => {
    const declared = loadRuleDocsManifest(packageRoot).rules;

    expect(existsSync(join(rulesDir, RETIRED_DOC))).toBe(false);
    expect(declared.some((entry) => entry.filename === RETIRED_DOC)).toBe(false);
    // Its `filid_` prefix is what lets the owned-orphan sweep retire an already
    // deployed copy, so no manifest legacy address is needed to migrate it.
    expect(RETIRED_DOC.startsWith('filid_')).toBe(true);
  });

  it('opens every document with the precedence chain', () => {
    const PRECEDENCE = /^> \*\*Precedence\*\*:/m;

    expect(
      shipped.filter((doc) => !PRECEDENCE.test(doc.text)).map((doc) => doc.name),
    ).toEqual([]);
    expect(PRECEDENCE.test('# Rule\n\nbody with no chain')).toBe(false);
  });

  it('states the format grounding in every document', () => {
    const GROUNDING = /\brests on (a property|properties)\b/i;

    expect(
      shipped.filter((doc) => !GROUNDING.test(doc.text)).map((doc) => doc.name),
    ).toEqual([]);
    expect(GROUNDING.test('This rule rests on properties every codebase has')).toBe(
      true,
    );
    expect(GROUNDING.test('a rule with no grounding sentence')).toBe(false);
  });

  it('carries the double falsification in every document', () => {
    const broken = shipped
      .filter(
        (doc) =>
          !/This rule is working if:/.test(doc.text) ||
          !/is wrong for you if:/.test(doc.text),
      )
      .map((doc) => doc.name);

    expect(broken).toEqual([]);
    // One half alone does not satisfy it.
    expect(/is wrong for you if:/.test('This rule is working if: x')).toBe(false);
  });

  it('gives conditional documents the frontmatter key the harness reads', () => {
    const conditional = shipped.filter((doc) => doc.text.startsWith('---\n'));

    expect(conditional.map((doc) => doc.name)).toEqual([
      'filid_module-documents.md',
      'filid_verification-records.md',
    ]);
    for (const doc of conditional) {
      // Claude Code reads `paths:`. A `globs:` key parses as unknown
      // frontmatter and is dropped, which silently makes the rule
      // unconditional — the exact failure this asserts against.
      expect(doc.text).toMatch(/^paths:$/m);
      expect(doc.text).not.toMatch(/^globs:/m);
      // Precedence still opens the body, not the frontmatter.
      expect(doc.text).toMatch(/^---\n[\s\S]*?\n---\n/);
    }
  });
});
