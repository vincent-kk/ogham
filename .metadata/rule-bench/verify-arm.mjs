#!/usr/bin/env node
// loaded by: manual invocation — node .metadata/rule-bench/verify-arm.mjs <ARM>
// Verifies an arm under arms/<ARM> against the invariants both plugins' test suites
// enforce (precedence header, B5 grounding — in the document or, after the manifest
// migration, in the plugin manifest's `grounding` field — falsification pair, seiri
// threshold and runner bans, conditional `paths:` set), the section numbers that skills,
// rules, module documents and source comments cite, and header/footer/table parity with
// the R3c baseline. A rule absent from the arm's registered roster is reported as
// retired, and any
// citation of a retired rule outside the arm is a problem. Prints per-file byte deltas
// and `<ARM>_INVARIANTS_OK`, or a PROBLEMS list with exit 1.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const arm = process.argv[2] ?? 'R4';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const armDir = join(root, '.metadata', 'rule-bench', 'arms', arm);
const baselineDir = join(root, '.metadata', 'rule-bench', 'arms', 'R3c');
const ruleFiles = (dir) =>
  readdirSync(dir)
    .filter((name) => /^(seiri|filid)_.*\.md$/.test(name))
    .sort();
const baseline = ruleFiles(baselineDir);
const expectedByArm = {
  R3c: baseline,
  R4: baseline,
  R5: baseline.filter((name) => name !== 'seiri_cognitive-discipline.md'),
  R5p: baseline.filter(
    (name) =>
      ![
        'seiri_cognitive-discipline.md',
        'seiri_context-efficiency.md',
        'seiri_naming.md',
        'seiri_structure.md',
      ].includes(name),
  ),
};
const expected = expectedByArm[arm];
const actual = ruleFiles(armDir);
const rosterProblems = [];
if (!expected) {
  rosterProblems.push(`${arm}: no expected roster`);
} else if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  rosterProblems.push(
    `${arm}: roster mismatch expected ${expected.join(', ')}; got ${actual.join(', ')}`,
  );
}
const files = expected ?? actual;
const retired = baseline.filter((file) => !files.includes(file));
const manifestGrounding = new Map();
for (const plugin of ['seiri', 'filid']) {
  const manifest = JSON.parse(readFileSync(join(root, 'plugins', plugin, 'templates', 'rules', 'manifest.json'), 'utf8'));
  for (const entry of manifest.rules) if (typeof entry.grounding === 'string') manifestGrounding.set(entry.filename, entry.grounding);
}

const prose = (t) => t.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
const GROUNDING = /\brests on (a property|properties)\b/i;
const THRESHOLD = /\b\d+\s*(lines?|cases?|levels?|chars?|columns?)\b|[<>]=?\s*\d+|\bLCOM\d?\b|\bmax[ -]?depth\b/gi;
const RUNNER = /\b(npm|yarn|pnpm|pytest|cargo|go test|gradle|mvn)\b/i;
const CONDITIONAL = new Set(['seiri_test-validity.md', 'filid_module-documents.md', 'filid_verification-records.md']);
const ALLOWED_THRESHOLDS = { 'seiri_code-comments.md': ['3 lines'], 'seiri_function-boundaries.md': ['8 lines'] };
const FOOTER_EXEMPT = new Set(['seiri_reuse-first.md']);
const TABLE_EXEMPT = new Set(['seiri_cognitive-discipline.md']);

const problems = [...rosterProblems];
const rows = [];
const headings = new Map();
for (const f of files) {
  const cur = readFileSync(join(baselineDir, f), 'utf8');
  const next = readFileSync(join(armDir, f), 'utf8');
  const nums = Array.from(next.matchAll(/^## (\d+)\./gm), (m) => Number(m[1]));
  headings.set(f.slice(0, -3), new Set(nums));
  rows.push({ file: f, curB: Buffer.byteLength(cur), newB: Buffer.byteLength(next), sections: nums.join(',') });
  if (!/^> \*\*Precedence\*\*:/m.test(next)) problems.push(`${f}: no precedence`);
  if (!GROUNDING.test(next) && !GROUNDING.test(manifestGrounding.get(f) ?? '')) problems.push(`${f}: no grounding (document or manifest)`);
  if (!/This rule is working if:/.test(next) || !/is wrong for you if:/.test(next)) problems.push(`${f}: falsification pair`);
  if (!next.endsWith('\n') || /\r/.test(next)) problems.push(`${f}: line endings`);
  if (f.startsWith('seiri_')) {
    const hits = Array.from(prose(next).matchAll(THRESHOLD), (m) => m[0]);
    if (JSON.stringify(hits) !== JSON.stringify(ALLOWED_THRESHOLDS[f] ?? [])) problems.push(`${f}: threshold hits ${JSON.stringify(hits)}`);
    if (RUNNER.test(prose(next))) problems.push(`${f}: runner name`);
  }
  const conditional = next.startsWith('---\n');
  if (conditional !== CONDITIONAL.has(f)) problems.push(`${f}: conditional mismatch`);
  if (conditional && (!/^paths:$/m.test(next) || /^globs:/m.test(next))) problems.push(`${f}: paths/globs`);
  // Header parity ignores the B5 sentence so a manifest-migrated arm still compares equal.
  const bq = (t) => (t.split('\n').find((l) => l.startsWith('> **Precedence**')) ?? '').replace(/ This rule rests on (?:a property|properties)[^.]*\./, '');
  if (bq(cur) !== bq(next)) problems.push(`${f}: header blockquote differs`);
  const foot = (t) => t.trimEnd().split('\n').at(-1);
  if (foot(cur) !== foot(next) && !FOOTER_EXEMPT.has(f)) problems.push(`${f}: footer differs`);
  const tables = (t) => t.split('\n').filter((l) => l.startsWith('|')).join('\n');
  if (tables(cur) !== tables(next) && !TABLE_EXEMPT.has(f)) problems.push(`${f}: table lines differ`);
}

const text = (f) => readFileSync(join(armDir, f), 'utf8');
const need = [
  ['seiri_context-efficiency.md', /pays twice/i],
  ['seiri_cognitive-discipline.md', /fix where it started/i],
  ['seiri_function-boundaries.md', /each helper's implementation body must be 8 lines or fewer; its declaration or signature and enclosing braces do not count/],
  ['seiri_code-comments.md', /and it stays within 3 lines/],
  ['seiri_agent-legible.md', /loaded by <mechanism>/],
  ['seiri_agent-legible.md', /entry point is <X>, not <Y>/],
  ['seiri_naming.md', /`util2`/],
  ['seiri_reuse-first.md', /^5\. \*\*Write new code\*\*/m],
  ['filid_fractal-boundaries.md', /Companions:/],
  ['filid_fractal-boundaries.md', /`components`, `utils`, `types`/],
  ['filid_code-placement.md', /once at the pull-request or merge-track seam/],
];
for (const [f, re] of need) if (files.includes(f) && !re.test(text(f))) problems.push(`${f}: missing ${re}`);
const section = (t, n) => t.split(/^## /m).find((s) => s.startsWith(`${n}.`)) ?? '';
if (!/never converted to a pass/.test(section(text('filid_fractal-boundaries.md'), 6))) problems.push('fractal-boundaries §6 lost indeterminate clause');
if (!/never converted to a pass/.test(section(text('filid_verification-records.md'), 3))) problems.push('verification-records §3 lost indeterminate clause');

const NAMED = /\b((?:seiri|filid)_[a-z-]+)(?:\.md)?`?\s*§(\d+)/g;
const RETIRED_RE = retired.length ? new RegExp(`\\b(${retired.map((f) => f.slice(0, -3)).join('|')})\\b`, 'g') : null;
const SCANNED = /\.(md|ts)$/;
const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    if (['node_modules', 'dist', 'bridge', 'public', '.codex-plugin'].includes(n)) return [];
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : SCANNED.test(n) ? [p] : [];
  });
const scan = [
  ...files.map((f) => join(armDir, f)),
  ...walk(join(root, 'plugins', 'seiri', 'skills')),
  ...walk(join(root, 'plugins', 'seiri', 'src')),
  ...walk(join(root, 'plugins', 'filid', 'skills')),
  ...walk(join(root, 'plugins', 'filid', 'src')),
];
for (const p of scan) {
  const t = readFileSync(p, 'utf8');
  for (const [, rule, n] of t.matchAll(NAMED)) if (!headings.get(rule)?.has(Number(n))) problems.push(`unresolved ${rule} §${n} in ${p.replace(root + '/', '')}`);
  if (RETIRED_RE && !p.startsWith(armDir) && !/__tests__/.test(p)) for (const [, rule] of t.matchAll(RETIRED_RE)) problems.push(`retired ${rule} cited in ${p.replace(root + '/', '')}`);
}
for (const f of files) {
  const own = headings.get(f.slice(0, -3));
  for (const [, n] of text(f).replace(NAMED, '').matchAll(/§(\d+)/g)) if (!own.has(Number(n))) problems.push(`${f}: bare §${n} unresolved`);
}

let curT = 0, newT = 0, curS = 0, newS = 0;
for (const f of baseline) { const b = Buffer.byteLength(readFileSync(join(baselineDir, f))); curT += b; if (!CONDITIONAL.has(f)) curS += b; }
for (const r of rows) { newT += r.newB; if (!CONDITIONAL.has(r.file)) newS += r.newB; }
console.log(`ARM ${arm}: ${files.length} files, retired: ${retired.join(', ') || 'none'}`);
for (const r of rows) console.log(`${r.file} | ${r.curB} -> ${r.newB} (${((r.newB / r.curB - 1) * 100).toFixed(0)}%) | §${r.sections}`);
console.log(`TOTAL ${curT} -> ${newT} (${((newT / curT - 1) * 100).toFixed(1)}%) · standing ${curS} -> ${newS} (${((newS / curS - 1) * 100).toFixed(1)}%)`);
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : `${arm}_INVARIANTS_OK`);
process.exit(problems.length ? 1 : 0);
