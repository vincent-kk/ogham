import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { addArticle } from './add-article.mjs';
import { inspectHtml } from './inspect-html.mjs';
import { moveArticle } from './move-article.mjs';
import { parseArguments } from './parse-arguments.mjs';
import { removeArticle } from './remove-article.mjs';
import { resolveVaultRoot } from './resolve-vault-root.mjs';
import { syncCatalog } from './sync-catalog.mjs';
import { updateArticle } from './update-article.mjs';
import { verifyLibrary } from './verify-library.mjs';

/**
 * Dispatch one management command after resolving its vault boundary.
 * @param {string} scriptUrl import.meta.url from the generated runner
 * @param {string[]} argv raw command and option arguments
 * @returns {Record<string, unknown>} machine-readable operation result
 */
export function runCommand(scriptUrl, argv) {
  const [command, ...rawOptions] = argv;
  if (!command) {
    throw new Error(
      'Command required: inspect|add|update|move|remove|sync|verify',
    );
  }
  const options = parseArguments(rawOptions);
  if (command === 'inspect') return inspectHtml(options.source);

  const vaultRoot = resolveVaultRoot(scriptUrl, options.vault);
  const libraryRoot = join(vaultRoot, 'library');
  if (!existsSync(libraryRoot)) {
    throw new Error(`Library does not exist: ${libraryRoot}`);
  }
  if (command === 'add') return addArticle(libraryRoot, options);
  if (command === 'update') return updateArticle(libraryRoot, options);
  if (command === 'move') return moveArticle(libraryRoot, options);
  if (command === 'remove') return removeArticle(libraryRoot, options);
  if (command === 'sync') {
    const entries = syncCatalog(libraryRoot);
    return { operation: 'synced', articleCount: entries.length };
  }
  if (command === 'verify') return verifyLibrary(libraryRoot);
  throw new Error(`Unknown command: ${command}`);
}
