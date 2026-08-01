#!/usr/bin/env node
// loaded by: manual invocation —
//   node .metadata/rule-bench/grade.mjs <runDir> [--issue <id>] [--log <file.jsonl>]
//   node .metadata/rule-bench/grade.mjs --selftest [id ...]
// Grades a prepared run directory against its issue's oracles, or verifies every
// oracle's discriminative power (base fails shown / naive passes shown but not
// hidden / correct passes both). Scores come from `node --test` exit codes and
// TAP counts only — agent self-reports never enter the score.
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const benchRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Recursively lists file paths under a directory.
 * @param {string} dir - directory to walk
 * @returns {string[]} paths relative to dir, using the host separator
 */
function listFiles(dir) {
  const acc = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else acc.push(relative(dir, p));
    }
  };
  walk(dir);
  return acc;
}

/**
 * Runs `node --test` on explicit files and parses the TAP summary.
 * @param {string} cwd - directory to run in
 * @param {string[]} files - test files relative to cwd; must be non-empty
 * @returns {{status: number | null, pass: number, fail: number, out: string}} exit status and TAP counts
 */
function runNodeTest(cwd, files) {
  const res = spawnSync(process.execPath, ['--test', ...files], { cwd, encoding: 'utf8', timeout: 60_000 });
  const out = (res.stdout ?? '') + (res.stderr ?? '');
  const num = (re) => Number((out.match(re) ?? [])[1] ?? 0);
  return { status: res.status, pass: num(/^# pass (\d+)/m), fail: num(/^# fail (\d+)/m), out };
}

/**
 * Grades one directory against an issue's oracles.
 * @param {string} dir - run directory (mutated: protected files restored, hidden tests injected)
 * @param {object} meta - parsed meta.json for the issue
 * @param {string} issueDir - the issue's directory under issues/
 * @returns {{shownPassed: number, shownTotal: number, hiddenPassed: number, hiddenTotal: number}} scores
 */
function gradeDir(dir, meta, issueDir) {
  const fixtureDir = join(issueDir, 'fixture');
  for (const f of meta.protectedFiles) cpSync(join(fixtureDir, f), join(dir, f));
  for (const f of readdirSync(dir).filter((n) => n.startsWith('__hidden__'))) rmSync(join(dir, f));

  let shownPassed = 0;
  for (const f of meta.shownTests) if (runNodeTest(dir, [f]).status === 0) shownPassed += 1;

  let hiddenPassed = 0;
  if (meta.special === 'fail-first') {
    const pristine = new Set(listFiles(fixtureDir));
    const added = listFiles(dir).filter(
      (f) => f.endsWith('.test.js') && !pristine.has(f) && !f.startsWith('__hidden__') && !f.includes('.claude'),
    );
    if (added.length > 0) {
      hiddenPassed += 1;
      const prefix = mkdtempSync(join(tmpdir(), 'bench-prefix-'));
      cpSync(fixtureDir, prefix, { recursive: true });
      for (const f of added) cpSync(join(dir, f), join(prefix, f));
      const onBuggy = runNodeTest(prefix, added);
      rmSync(prefix, { recursive: true, force: true });
      if (onBuggy.status !== 0 || onBuggy.fail > 0) hiddenPassed += 1;
      if (runNodeTest(dir, added).status === 0) hiddenPassed += 1;
    }
  } else {
    const hiddenSrc = join(issueDir, 'hidden');
    const deployed = [];
    for (const f of readdirSync(hiddenSrc)) {
      const name = `__hidden__${f}`;
      cpSync(join(hiddenSrc, f), join(dir, name));
      deployed.push(name);
    }
    hiddenPassed = Math.min(runNodeTest(dir, deployed).pass, meta.hiddenTotal);
  }
  return { shownPassed, shownTotal: meta.shownTests.length, hiddenPassed, hiddenTotal: meta.hiddenTotal };
}

/**
 * Loads an issue's meta.json.
 * @param {string} id - issue id such as "iA"
 * @returns {{issueDir: string, meta: object}} issue directory and parsed meta
 */
function loadIssue(id) {
  const issueDir = join(benchRoot, 'issues', id);
  return { issueDir, meta: JSON.parse(readFileSync(join(issueDir, 'meta.json'), 'utf8')) };
}

/**
 * Verifies oracle discrimination for one issue using its selftest overlays.
 * @param {string} id - issue id
 * @returns {{issue: string, base: boolean, naive: boolean, correct: boolean}} per-stage verdicts
 */
function selftestIssue(id) {
  const { issueDir, meta } = loadIssue(id);
  const stage = (overlay) => {
    const dir = mkdtempSync(join(tmpdir(), `bench-self-${id}-`));
    cpSync(join(issueDir, 'fixture'), dir, { recursive: true });
    if (overlay) cpSync(join(issueDir, 'selftest', overlay), dir, { recursive: true, force: true });
    const score = gradeDir(dir, meta, issueDir);
    rmSync(dir, { recursive: true, force: true });
    return score;
  };
  const base = stage(null);
  const naive = stage('naive');
  const correct = stage('correct');
  return {
    issue: id,
    base: base.shownPassed < base.shownTotal,
    naive: naive.shownPassed === naive.shownTotal && naive.hiddenPassed < naive.hiddenTotal,
    correct: correct.shownPassed === correct.shownTotal && correct.hiddenPassed === correct.hiddenTotal,
  };
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) {
  const ids = argv.filter((a) => /^i[A-Z]$/.test(a));
  const all = ids.length > 0 ? ids : readdirSync(join(benchRoot, 'issues')).sort();
  let bad = 0;
  for (const id of all) {
    const r = selftestIssue(id);
    if (!(r.base && r.naive && r.correct)) bad += 1;
    console.log(JSON.stringify(r));
  }
  process.exit(bad === 0 ? 0 : 1);
}

const runDir = argv.find((a) => !a.startsWith('--'));
if (!runDir) {
  console.error('usage: grade.mjs <runDir> [--issue <id>] [--log <file>] | grade.mjs --selftest [id ...]');
  process.exit(2);
}
const flag = (name) => {
  const i = argv.indexOf('--' + name);
  return i > -1 ? argv[i + 1] : undefined;
};
const id = flag('issue') ?? (basename(runDir).match(/^(i[A-Z])-/) ?? [])[1];
const { issueDir, meta } = loadIssue(id);
const arm = (basename(runDir).match(/-(R[0-9]+)-t(\d+)$/) ?? [])[1] ?? 'unknown';
const rep = Number((basename(runDir).match(/-t(\d+)$/) ?? [])[1] ?? 0);
const row = { issue: id, arm, rep, ...gradeDir(runDir, meta, issueDir) };
if (meta.finalMention) {
  const finalPath = join(runDir, 'FINAL.md');
  row.finalMention = existsSync(finalPath)
    ? new RegExp(meta.finalMention, 'i').test(readFileSync(finalPath, 'utf8'))
    : false;
}
const line = JSON.stringify(row);
if (flag('log')) appendFileSync(flag('log'), line + '\n');
console.log(line);
