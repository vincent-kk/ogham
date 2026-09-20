import { ECMASCRIPT_ADAPTER_ID } from '../structure/ecmascriptConventions.js';
import { verificationRoleFromName } from './verificationRoleFromName.js';
import type { VerificationAdapter } from '../../../types/adapters.js';
import { ecmascriptStructureAdapter } from '../structure/ecmascriptStructureAdapter.js';

/**
 * Which ECMAScript files are verification files.
 *
 * Discovery only: the name proposes the role and the file's facts record
 * confirms it. A candidate whose record reports `unsupported` is left out of
 * the analysis by the caller, so a `.spec` file with no verification syntax
 * costs a record read rather than a parse here (spec §11-8).
 */
export const ecmascriptVerificationAdapter: VerificationAdapter = {
  id: ECMASCRIPT_ADAPTER_ID,
  detect(projectRoot) {
    return ecmascriptStructureAdapter.detect(projectRoot);
  },
  async discover(projectRoot) {
    const files =
      await ecmascriptStructureAdapter.discoverSourceFiles(projectRoot);
    return files
      .filter((filePath) => verificationRoleFromName(filePath) !== 'unsupported')
      .sort();
  },
};
