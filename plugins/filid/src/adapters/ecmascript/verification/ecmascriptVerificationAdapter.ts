import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

import type {
  VerificationAdapter,
  VerificationRole,
} from '../../../types/adapters.js';
import {
  ECMASCRIPT_ADAPTER_ID,
  SOURCE_EXTENSIONS,
} from '../structure/ecmascriptConventions.js';
import { ecmascriptStructureAdapter } from '../structure/ecmascriptStructureAdapter.js';

import { countSemanticCases } from './countSemanticCases.js';
import { extractContractGroupIds } from './extractContractGroupIds.js';

function classifyVerificationPath(
  filePath: string,
): VerificationRole | 'unsupported' {
  const extension = extname(filePath);
  if (
    !SOURCE_EXTENSIONS.includes(extension as (typeof SOURCE_EXTENSIONS)[number])
  )
    return 'unsupported';
  const stem = basename(filePath, extension);
  if (stem.endsWith('.spec')) return 'spec-document';
  if (stem.endsWith('.test')) return 'test-record';
  return 'unsupported';
}

export const ecmascriptVerificationAdapter: VerificationAdapter = {
  id: ECMASCRIPT_ADAPTER_ID,
  detect(projectRoot) {
    return ecmascriptStructureAdapter.detect(projectRoot);
  },
  async discover(projectRoot) {
    const files =
      await ecmascriptStructureAdapter.discoverSourceFiles(projectRoot);
    return files
      .filter(
        (filePath) => classifyVerificationPath(filePath) !== 'unsupported',
      )
      .sort();
  },
  async classify(filePath) {
    return classifyVerificationPath(filePath);
  },
  async count(filePath) {
    if (classifyVerificationPath(filePath) === 'unsupported')
      return {
        certainty: 'unsupported',
        exactCount: undefined,
        knownLowerBound: 0,
        reasons: ['file role is not supported by the ECMAScript adapter'],
      };
    return countSemanticCases(readFileSync(filePath, 'utf8'));
  },
  async extractContractGroupIds(filePath) {
    if (classifyVerificationPath(filePath) === 'unsupported') return [];
    return extractContractGroupIds(readFileSync(filePath, 'utf8'));
  },
};
