import type { ManagedRuleDocument } from '@ogham/agent-artifacts';
import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type { RuleDocsManifest } from './manifestTypes.js';

export function loadManagedRuleDocuments(
  pluginRoot: string,
  manifest: RuleDocsManifest,
): readonly ManagedRuleDocument[] {
  return manifest.rules.map((entry) => ({
    id: entry.id,
    filename: entry.filename,
    content: readUtf8FileIfExistsSync(
      resolveContainedPath(pluginRoot, 'templates', 'rules', entry.filename),
    ),
    ...(entry.legacyFilename === undefined
      ? {}
      : { legacyFilenames: [entry.legacyFilename] }),
  }));
}
