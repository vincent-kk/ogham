#!/usr/bin/env node
/** Loaded by focused verification gates; each argument must identify a runnable test file. */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root is independent of the caller's working directory. */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Spawn the package's designated test command with literal argv; return its exit status. */
function runChild(command, args, options) {
  return new Promise((fulfill, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code) => fulfill(code));
  });
}

/** Reject missing, mismatched, empty or partially executed assertion reports. */
async function verifyReport(reportPath, expected) {
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const matches = report.testResults?.filter(
    (result) => resolve(result.name) === expected,
  );
  if (matches?.length !== 1)
    throw new Error(`Missing exact result: ${expected}`);
  const assertions = matches[0].assertionResults;
  if (
    !Array.isArray(assertions) ||
    assertions.length === 0 ||
    assertions.some((assertion) => assertion.status !== 'passed')
  ) {
    throw new Error(`Required assertions did not all pass: ${expected}`);
  }
}

/** Run each package-relative file independently; throws on any missing file or unsuccessful run. */
export async function verifyRequiredTests(
  files,
  { root = packageRoot, run = runChild } = {},
) {
  if (files.length === 0)
    throw new Error('At least one required test file is needed');
  const canonicalRoot = await realpath(root);
  const requested = [];
  for (const file of files) {
    const path = resolve(canonicalRoot, file);
    const inside = relative(canonicalRoot, path);
    if (isAbsolute(file) || inside.startsWith('..') || !inside)
      throw new Error(`Invalid test path: ${file}`);
    if (!(await stat(path).catch(() => null))?.isFile())
      throw new Error(`Missing required test file: ${file}`);
    const canonical = await realpath(path);
    if (relative(canonicalRoot, canonical).startsWith('..'))
      throw new Error(`Invalid test symlink: ${file}`);
    requested.push({ file, path: canonical });
  }
  const temporary = await mkdtemp(resolve(tmpdir(), 'maencof-test-report-'));
  try {
    for (const [index, request] of requested.entries()) {
      const reportPath = resolve(temporary, `${index}.json`);
      const code = await run(
        'yarn',
        [
          'test:run',
          request.file,
          '--passWithNoTests=false',
          '--reporter=json',
          `--outputFile=${reportPath}`,
        ],
        { cwd: canonicalRoot },
      );
      if (code !== 0)
        throw new Error(`Test process exit ${code}: ${request.file}`);
      await verifyReport(reportPath, request.path);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await verifyRequiredTests(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
