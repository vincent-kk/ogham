#!/usr/bin/env node
/**
 * Smoke test: with the gh shim active (CI mode), verify that no Atlassian
 * tool calls occur, no .imbas/{run}/issues/ writes happen, and at least one
 * gh spawn is recorded. Exit 0 on success, 1 on failure.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'test-helpers', 'fixtures', 'gh');

const _require = createRequire(import.meta.url);
const fs = _require('fs');

const fixtures = {
  'issue-view': JSON.parse(readFileSync(join(FIXTURES_DIR, 'issue-view.json'), 'utf8')),
  'issue-create': JSON.parse(readFileSync(join(FIXTURES_DIR, 'issue-create.json'), 'utf8')),
  'label-list': JSON.parse(readFileSync(join(FIXTURES_DIR, 'label-list.json'), 'utf8')),
};

const { createGhShim } = await import('./test-helpers/gh-shim.mjs');
const shim = createGhShim({ fixtures });
shim.install();

const wroteTo = [];
const _origWriteFile = fs.writeFile;
const _origWriteFileSync = fs.writeFileSync;
const _origPromisesWriteFile = fs.promises.writeFile;

fs.writeFile = function patchedWriteFile(path, ...rest) {
  wroteTo.push(String(path));
  return _origWriteFile(path, ...rest);
};

fs.writeFileSync = function patchedWriteFileSync(path, ...rest) {
  wroteTo.push(String(path));
  return _origWriteFileSync(path, ...rest);
};

fs.promises.writeFile = async function patchedPromisesWriteFile(path, ...rest) {
  wroteTo.push(String(path));
  return _origPromisesWriteFile(path, ...rest);
};

const childProcess = _require('child_process');

function runGhCreate(title) {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn('gh', [
      'issue', 'create',
      '--repo', 'owner/repo',
      '--title', title,
      '--body', 'test body',
      '--label', 'type:story',
    ]);
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('close', (code) => {
      if (code === 0) resolve(JSON.parse(out || '{}'));
      else reject(new Error('gh exit ' + code));
    });
  });
}

function runGhComment(issueNumber) {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn('gh', [
      'issue', 'comment', String(issueNumber),
      '--repo', 'owner/repo',
      '--body', '<!-- imbas:digest --> Digest 2026-04-06 created',
    ]);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('gh comment exit ' + code));
    });
  });
}

try {
  await runGhCreate('Story A');
  await runGhCreate('Story B');
  await runGhComment(55);
} catch (err) {
  console.error('FAIL: shim execution error:', err.message);
  process.exit(1);
}

// Run assertions
const { calls } = shim;

// Assertion 1: zero atlassian calls
const atlassianCalls = calls.filter(
  (c) => /atlassian/i.test(c.cmd + ' ' + c.args.join(' '))
);
if (atlassianCalls.length !== 0) {
  console.error('FAIL: atlassian-calls', atlassianCalls[0]);
  process.exit(1);
}

// Assertion 2: zero .imbas/{run}/issues/ writes
const issuesDirWrites = wroteTo.filter((p) => /\.imbas\/[^/]+\/issues\//.test(p));
if (issuesDirWrites.length !== 0) {
  console.error('FAIL: issues-dir-writes', issuesDirWrites[0]);
  process.exit(1);
}

// Assertion 3: at least one gh spawn call
const ghCalls = calls.filter(
  (c) => /^gh\b/.test(c.cmd) || c.cmd === 'gh'
);
if (ghCalls.length === 0) {
  console.error('FAIL: no-gh-calls', calls);
  process.exit(1);
}

shim.uninstall();
console.log('OK');
process.exit(0);
