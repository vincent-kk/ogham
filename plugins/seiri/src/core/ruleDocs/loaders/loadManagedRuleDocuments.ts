import type { ManagedRuleDocument } from '@ogham/agent-artifacts/rules';
import { readUtf8FileIfExistsSync } from '@ogham/cross-platform/filesystem/read/utf8';
import { resolveContainedPath } from '@ogham/cross-platform/paths/contained';

import type { RuleDocsManifest } from '../../../types/manifest.js';

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
  }));
}
