import { createHash } from 'node:crypto';

import {
  assertNoSymlinkDescendantsSync,
  pluginCache,
  portableResolve,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type { McpToolName } from '../../../../constants/mcpToolNames.js';
import {
  TOOL_ARTIFACT_DIRECTORY,
  TOOL_ARTIFACT_EPHEMERAL,
  TOOL_ARTIFACT_FILE_SUFFIX,
  TOOL_ARTIFACT_HASH_ALGORITHM,
  TOOL_ARTIFACT_HASH_ENCODING,
  TOOL_ARTIFACT_PLUGIN_NAME,
  TOOL_ARTIFACT_TEXT_ENCODING,
  TOOL_MEDIA_TYPES,
} from '../../../../constants/toolEnvelope.js';
import type { ToolArtifact } from '../../../../types/toolEnvelope.js';
import { writeArtifactAtomic } from '../operations/writeArtifactAtomic.js';

export function persistToolArtifact(
  toolName: McpToolName,
  serializedPayload: string,
): ToolArtifact {
  const sha256 = createHash(TOOL_ARTIFACT_HASH_ALGORITHM)
    .update(serializedPayload, TOOL_ARTIFACT_TEXT_ENCODING)
    .digest(TOOL_ARTIFACT_HASH_ENCODING);
  const cacheRoot = portableResolve(pluginCache(TOOL_ARTIFACT_PLUGIN_NAME));
  const artifactPath = resolveContainedPath(
    cacheRoot,
    TOOL_ARTIFACT_DIRECTORY,
    toolName,
    `${sha256}${TOOL_ARTIFACT_FILE_SUFFIX}`,
  );
  assertNoSymlinkDescendantsSync(cacheRoot, artifactPath);
  writeArtifactAtomic(artifactPath, serializedPayload);

  return {
    path: artifactPath,
    mediaType: TOOL_MEDIA_TYPES.JSON,
    sha256,
    bytes: Buffer.byteLength(serializedPayload, TOOL_ARTIFACT_TEXT_ENCODING),
    ephemeral: TOOL_ARTIFACT_EPHEMERAL,
  };
}
