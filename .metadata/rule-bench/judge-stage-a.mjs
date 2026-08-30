#!/usr/bin/env node
// loaded by: manual invocation — node .metadata/rule-bench/judge-stage-a.mjs <results.jsonl> <ARM>
// Applies the pre-registered Stage A rule within one model and issue:
// fullpass(ARM) >= fullpass(R3c) - 1.
import { readFileSync } from 'node:fs';

const [file, arm] = process.argv.slice(2);
const rows = readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));

// This is the pre-registered Stage A matrix for the 2026-08-30 result set.
// Rows from Stage B and the sol × iE × R5 Stage C confirmation are deliberately
// outside this whitelist, so they cannot silently become candidate evidence.
const STAGE_A = {
  R4: [
    {
      model: 'gpt-5.6-luna',
      issues: ['iA', 'iC', 'iD', 'iE', 'iF', 'iG', 'iH', 'iI', 'iK'],
      reps: 5,
    },
  ],
  R5: [{ model: 'gpt-5.6-luna', issues: ['iE'], reps: 5 }],
  R5p: [
    { model: 'gpt-5.6-luna', issues: ['iD', 'iI'], reps: 5 },
    { model: 'gpt-5.6-terra', issues: ['iJ'], reps: 5 },
  ],
};

let pass = true;
const seen = new Set();
for (const row of rows) {
  const key = `${row.model ?? 'unspecified'}|${row.issue}|${row.arm}|${row.rep}`;
  if (seen.has(key)) {
    console.log(`duplicate result key ${key}`);
    pass = false;
  }
  seen.add(key);
}

const matrix = STAGE_A[arm];
if (!matrix) {
  console.log(`no Stage A matrix for ${arm}`);
  pass = false;
}

const full = (row) =>
  row.shownPassed === row.shownTotal && row.hiddenPassed === row.hiddenTotal;
const expectedReps = (n) => Array.from({ length: n }, (_, index) => index + 1);

for (const group of matrix ?? []) {
  for (const issue of group.issues) {
    const cells = {};
    for (const cellArm of ['R3c', arm]) {
      const cell = rows.filter(
        (row) =>
          row.model === group.model &&
          row.issue === issue &&
          row.arm === cellArm,
      );
      const actual = cell.map((row) => row.rep).sort((a, b) => a - b);
      const expected = expectedReps(group.reps);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.log(
          `missing Stage A cell ${group.model} ${issue} ${cellArm}: expected reps ${expected.join(',')} got ${actual.join(',') || 'none'}`,
        );
        pass = false;
      }
      cells[cellArm] = { n: cell.length, full: cell.filter(full).length };
    }

    const base = cells.R3c;
    const candidate = cells[arm];
    const ok =
      base.n === group.reps &&
      candidate.n === group.reps &&
      candidate.full >= base.full - 1;
    if (!ok) pass = false;
    console.log(
      `${group.model} ${issue} R3c ${base.full}/${base.n} ${arm} ${candidate.full}/${candidate.n} ${ok ? 'PASS' : 'FAIL'}`,
    );
  }
}

console.log(pass ? `STAGE_A_${arm}_PASS` : `STAGE_A_${arm}_FAIL`);
process.exit(pass ? 0 : 1);
