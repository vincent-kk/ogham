import {
  portableJoin,
  portableResolve,
  readUtf8FileIfExistsSync,
} from '@ogham/cross-platform';

import { DETAIL_MD } from '../../../constants/documentFiles.js';
import { LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS } from '../../../constants/legacyCriteriaLedger.js';
import type { LegacyCriteriaLedgerEvidence } from '../../../types/fractal.js';

export function collectLegacyCriteriaLedger(
  projectRoot: string,
): LegacyCriteriaLedgerEvidence | null {
  const root = portableResolve(projectRoot);
  const path = portableJoin(
    root,
    LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS.DIRECTORY,
    LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS.BASENAME,
  );
  if (readUtf8FileIfExistsSync(path) === null) return null;
  return { path, targetDetailPath: portableJoin(root, DETAIL_MD) };
}
