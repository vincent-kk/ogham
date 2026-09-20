import { readFileSync } from 'node:fs';

import type { VerificationAdapter } from '../../../types/adapters.js';
import { ECMASCRIPT_ADAPTER_ID } from '../structure/ecmascriptConventions.js';
import { ecmascriptStructureAdapter } from '../structure/ecmascriptStructureAdapter.js';

import { classifyVerificationPath } from './classifyVerificationPath.js';
import { countVerificationCases } from './countVerificationCases.js';
import { extractContractGroupIds } from './extractContractGroupIds.js';

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
    return countVerificationCases(filePath);
  },
  async extractContractGroupIds(filePath) {
    if (classifyVerificationPath(filePath) === 'unsupported') return [];
    return extractContractGroupIds(readFileSync(filePath, 'utf8'));
  },
};
