import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

import { loadManifest } from '../core/ruleDocs/loaders/loadManifest.js';
import { computeFileSha256 } from '../core/utils/computeFileSha256.js';

/**
 * A mechanical drift guard, NOT a quality test. It checks only the things
 * about seiri rules that are string-level facts: the B1/B6 deployed skeleton
 * (precedence chain and double falsification — presence only), manifest-owned
 * B5 format grounding,
 * the filid/seiri boundary (numeric thresholds belong to filid except for
 * the function-helper and inline-comment readability budgets; test-runner
 * names always belong to the repository), and the D8 shared-idiom contract
 * (identical wording in a rule
 * and its skill, so a reword shows up as a red diff). Whether a rule is sound
 * or actually shifts behavior is a semantic question — that lives in the
 * micro-test / 10-issue A/B track, which an LLM evaluates. This file makes no
 * claim about it.
 */
const packageRoot = portableJoin(
  portableDirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const rulesDir = portableJoin(packageRoot, 'templates', 'rules');

const rules = readdirSync(rulesDir)
  .filter((name) => name.endsWith('.md') && name !== 'README.md')
  .map((name) => ({
    name,
    text: readFileSync(portableJoin(rulesDir, name), 'utf8'),
  }));

// Strip fenced + inline code so a quoted example (`util2`, a `>= 2` snippet)
// never trips the prose checks — the ban is on thresholds/runners in prose.
function prose(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

// A bare numeric threshold in prose: "200 lines", ">= 2", "max depth", "LCOM4".
const THRESHOLD =
  /\b\d+\s*(lines?|cases?|levels?|chars?|columns?)\b|[<>]=?\s*\d+|\bLCOM\d?\b|\bmax[ -]?depth\b/i;
// A language-specific test runner — seiri rules defer to the repo's own command.
const RUNNER = /\b(npm|yarn|pnpm|pytest|cargo|go test|gradle|mvn)\b/i;

describe('rule invariants (filid/seiri boundary + D8 idiom contract)', () => {
  it('only the two sanctioned readability budgets carry numeric thresholds', () => {
    const thresholds = rules.flatMap((rule) =>
      Array.from(
        prose(rule.text).matchAll(new RegExp(THRESHOLD.source, 'gi')),
        (match) => ({ rule: rule.name, threshold: match[0] }),
      ),
    );
    expect(thresholds).toEqual([
      {
        rule: 'seiri_code-comments.md',
        threshold: '3 lines',
      },
      {
        rule: 'seiri_function-boundaries.md',
        threshold: '8 lines',
      },
    ]);
    expect(
      rules.find((rule) => rule.name === 'seiri_function-boundaries.md')?.text,
    ).toContain(
      "each helper's implementation body must be 8 lines or fewer; its declaration or signature and enclosing braces do not count",
    );
    expect(
      rules.find((rule) => rule.name === 'seiri_code-comments.md')?.text,
    ).toContain('and it stays within 3 lines');
    // The guard bites: a leaked threshold is caught.
    expect(THRESHOLD.test('split files over 500 lines')).toBe(true);
  });

  it('no rule names a language-specific test runner — rules defer to the repo command', () => {
    const offenders = rules
      .filter((r) => RUNNER.test(prose(r.text)))
      .map((r) => r.name);
    expect(offenders).toEqual([]);
    expect(RUNNER.test('run npm test first')).toBe(true);
  });

  it('keeps the remaining D8 idiom in both the rule and its skill', () => {
    const read = (rel: string) =>
      readFileSync(portableJoin(packageRoot, rel), 'utf8');
    // The remaining D8 canon idiom must appear verbatim in both its rule and
    // skill, so a reword in either is a red diff.
    const contracts = [
      {
        idiom: 'pays twice',
        rule: 'templates/rules/seiri_context-efficiency.md',
        skill: 'skills/trace-cause/SKILL.md',
      },
    ];
    const broken = contracts
      .filter((c) => {
        const re = new RegExp(
          c.idiom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i',
        );
        return !(re.test(read(c.rule)) && re.test(read(c.skill)));
      })
      .map((c) => c.idiom);
    expect(broken).toEqual([]);
  });

  it('every manifest template hash matches its file — rebuild freshness', () => {
    const stale = loadManifest(packageRoot)
      .rules.filter(
        (r) =>
          computeFileSha256(portableJoin(rulesDir, r.filename)) !==
          r.templateHash,
      )
      .map((r) => r.filename);
    expect(stale).toEqual([]);
  });

  it('every rule opens with the B1 precedence chain', () => {
    const PRECEDENCE = /^> \*\*Precedence\*\*:/m;
    const offenders = rules
      .filter((r) => !PRECEDENCE.test(r.text))
      .map((r) => r.name);
    expect(offenders).toEqual([]);
    // The guard bites: a rule with no precedence block is caught.
    expect(PRECEDENCE.test('# Rule\n\nbody with no chain')).toBe(false);
  });

  it('conditional rules carry their own paths, and the key the harness reads', () => {
    const conditional = rules.filter((r) => r.text.startsWith('---\n'));
    // test-validity only binds while a test file is open, so it is the one
    // rule that should not be standing context.
    expect(conditional.map((r) => r.name)).toContain('seiri_test-validity.md');

    for (const rule of conditional) {
      // Claude Code reads `paths:`. A `globs:` key parses as unknown
      // frontmatter and is dropped, which silently makes the rule
      // unconditional — the exact failure this asserts against.
      expect(rule.text).toMatch(/^paths:$/m);
      expect(rule.text).not.toMatch(/^globs:/m);
      // Precedence still opens the body, not the frontmatter.
      expect(rule.text).toMatch(/^---\n[\s\S]*?\n---\n/);
    }
  });

  it('keeps the B5 grounding in the manifest, out of the deployed bytes', () => {
    const GROUNDING = /\brests on (a property|properties)\b/i;
    const missing = loadManifest(packageRoot)
      .rules.filter((r) => !GROUNDING.test(r.grounding ?? ''))
      .map((r) => r.id);
    expect(missing).toEqual([]);
    const leaked = rules
      .filter((r) => GROUNDING.test(r.text))
      .map((r) => r.name);
    expect(leaked).toEqual([]);
    expect(GROUNDING.test('a rule with no grounding sentence')).toBe(false);
  });

  it('every rule carries the B6 double falsification', () => {
    const offenders = rules
      .filter(
        (r) =>
          !/This rule is working if:/.test(r.text) ||
          !/is wrong for you if:/.test(r.text),
      )
      .map((r) => r.name);
    expect(offenders).toEqual([]);
    // The guard bites: one half alone does not satisfy B6.
    expect(/is wrong for you if:/.test('This rule is working if: x')).toBe(
      false,
    );
  });
});
