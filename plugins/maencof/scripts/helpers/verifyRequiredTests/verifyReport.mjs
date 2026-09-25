import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Reject missing, mismatched, empty or partially executed assertion reports. */
export async function verifyReport(reportPath, expected) {
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
