import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

import {
  portableBasename,
  portableDirname,
  samePath,
} from '@ogham/cross-platform';

import { McpToolName } from '../../../../constants/mcpToolNames.js';
import {
  TOOL_ARTIFACT_FILE_SUFFIX,
  TOOL_ARTIFACT_HASH_ALGORITHM,
  TOOL_ARTIFACT_HASH_ENCODING,
  TOOL_ARTIFACT_TEXT_ENCODING,
} from '../../../../constants/toolEnvelope.js';
import { resolveToolArtifactDirectory } from '../../../../core/infra/artifactStore/index.js';

/**
 * Whether an artifact is one the plan action stored, unchanged.
 *
 * The store names each artifact by the sha256 of its content, so an artifact
 * edited in place, or copied out of the store, fails. This stops an honest
 * agent from "fixing" a plan — a baseline, an import requirement — to pass a
 * failed postcondition; recomputing the digest and writing into the store on
 * purpose is out of scope.
 * @param planPath - Absolute path the caller passed
 * @param source - The artifact text read from it
 * @returns True when the real location is directly in the restructure store
 * and the file name is the content's digest
 */
export function isStoredPlanArtifact(
  planPath: string,
  source: string,
): boolean {
  try {
    const store = realpathSync(
      resolveToolArtifactDirectory(McpToolName.RESTRUCTURE),
    );
    const digest = createHash(TOOL_ARTIFACT_HASH_ALGORITHM)
      .update(source, TOOL_ARTIFACT_TEXT_ENCODING)
      .digest(TOOL_ARTIFACT_HASH_ENCODING);
    return (
      samePath(portableDirname(realpathSync(planPath)), store) &&
      portableBasename(planPath) === `${digest}${TOOL_ARTIFACT_FILE_SUFFIX}`
    );
  } catch {
    return false;
  }
}
