import { readFileSync } from 'node:fs';

import { resolveContainedPath } from '@ogham/cross-platform';

import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../../constants/reviewState.js';
import {
  locateReference,
  splitSourceLines,
} from '../../../../../core/facts/index.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/**
 * One seal refusal about a reference, carrying the line the caller has to read.
 *
 * The line is looked up rather than carried by the caller because what stops a
 * seal is a difference between two records, neither of which holds a position
 * in the file as it now stands.
 *
 * @param projectRoot - Absolute project root the file sits under.
 * @param path - Project-relative path of the file the refusal is about.
 * @param reference - Text to locate in that file, for the line number.
 * @param nextAction - What the caller does about it.
 * @param message - What changed and why it stops the seal.
 * @returns The diagnostic, whose `line` is absent when the file cannot be read.
 */
export function buildFactsDiscrepancyRefusal(
  projectRoot: string,
  path: string,
  reference: string,
  nextAction: string,
  message: string,
): ToolDiagnostic {
  const [line] = locateReferenceLines(projectRoot, path, reference);
  return {
    code: REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_DISCREPANCY,
    message,
    path,
    affects: [],
    owner: 'agent',
    ...(line === undefined ? {} : { line }),
    nextAction,
  };
}

/**
 * Lines the reference occurs on in the file as it now stands.
 * @param projectRoot Absolute project root the file sits under.
 * @param path Project-relative path of the file to read.
 * @param reference Specifier text to locate.
 * @returns 1-based line numbers, empty when the file cannot be read.
 */
function locateReferenceLines(
  projectRoot: string,
  path: string,
  reference: string,
): number[] {
  try {
    const bytes = readFileSync(resolveContainedPath(projectRoot, path));
    return locateReference(splitSourceLines(bytes.toString('utf8')), {
      specifier: reference,
    });
  } catch {
    return [];
  }
}
