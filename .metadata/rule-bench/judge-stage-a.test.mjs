import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const judge = fileURLToPath(new URL('./judge-stage-a.mjs', import.meta.url));
const LUNA = 'gpt-5.6-luna';
const SOL = 'gpt-5.6-sol';

function cell(model, issue, arm, reps) {
  return reps.map((rep) => ({
    issue,
    arm,
    rep,
    model,
    shownPassed: 1,
    shownTotal: 1,
    hiddenPassed: 3,
    hiddenTotal: 3,
  }));
}

function run(rows, arm = 'R5') {
  const dir = mkdtempSync(join(tmpdir(), 'judge-stage-a-'));
  const file = join(dir, 'results.jsonl');
  try {
    writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
    return spawnSync(process.execPath, [judge, file, arm], {
      encoding: 'utf8',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('accepts the complete R5 Stage A cell and ignores declared Stage C', () => {
  const result = run([
    ...cell(LUNA, 'iE', 'R3c', [1, 2, 3, 4, 5]),
    ...cell(LUNA, 'iE', 'R5', [1, 2, 3, 4, 5]),
    ...cell(SOL, 'iE', 'R5', [1, 2, 3]),
  ]);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /STAGE_A_R5_PASS/);
});

test('rejects an undersized candidate cell even when it is non-inferior', () => {
  const result = run([
    ...cell(LUNA, 'iE', 'R3c', [1, 2, 3, 4, 5]),
    ...cell(LUNA, 'iE', 'R5', [1, 2, 3, 4]),
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /expected reps 1,2,3,4,5/);
});

test('rejects duplicate repetitions instead of counting them twice', () => {
  const result = run([
    ...cell(LUNA, 'iE', 'R3c', [1, 2, 3, 4, 5]),
    ...cell(LUNA, 'iE', 'R5', [1, 1, 2, 3, 4]),
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /duplicate result key/);
});

test('rejects a candidate with no complete declared Stage A comparison', () => {
  const result = run([
    ...cell(LUNA, 'iE', 'R3c', [1, 2, 3, 4, 5]),
    ...cell(SOL, 'iE', 'R5', [1, 2, 3]),
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /missing Stage A cell/);
});
