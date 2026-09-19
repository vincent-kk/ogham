#!/usr/bin/env node
// Bundled by scripts/buildFactsExtractor.mjs into bridge/filid-facts.mjs; the agent runs it with node from its own shell.
import { existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { writeFileAtomicallySync } from '@ogham/cross-platform';

import { ecmascriptStructureAdapter } from '../adapters/ecmascript/index.js';

import { extractFileFacts } from './factsExtractor.js';
import { normalizeCommand } from './utils/input/normalizeCommand.js';
import { parseExtractorArguments } from './utils/input/parseExtractorArguments.js';
import { readFileList } from './utils/input/readFileList.js';
import { readListText } from './utils/input/readListText.js';
import { isOutputInsideProject } from './utils/paths/isOutputInsideProject.js';

/** Exit status of a command line the program refuses. */
const USAGE_ERROR = 2;
/** Unreadable paths the summary lists; the count covers the rest. */
const UNREADABLE_PATH_LIMIT = 20;

/**
 * Refuse the run with a reason on stderr.
 * @param reason What was wrong with the command line.
 * @returns Never; the process exits with the usage status.
 */
function refuse(reason: string): never {
  process.stderr.write(`filid-facts: ${reason}\n`);
  process.exit(USAGE_ERROR);
}

const argv = process.argv.slice(2);
const parsed = parseExtractorArguments(argv);
if ('error' in parsed) refuse(parsed.error);
const root = resolve(parsed.root);
if (!existsSync(root) || !statSync(root).isDirectory())
  refuse(`--root ${parsed.root} is not a directory.`);
const out = resolve(parsed.out);
if (isOutputInsideProject(root, realpathSync(root), out))
  refuse(
    `--out must lie outside the project tree; an untracked file inside it would change the tree the server reads. Write it under the OS temporary directory instead.`,
  );
if (!existsSync(dirname(out))) refuse(`the directory of --out does not exist.`);
if (existsSync(out) && statSync(out).isDirectory())
  refuse(`--out ${parsed.out} is a directory; give the path of a file.`);

const started = Date.now();
let listed: string[] = [];
if (parsed.filesFrom !== undefined) {
  const list = await readListText(parsed.filesFrom, process.stdin);
  if ('error' in list) refuse(list.error);
  try {
    listed = readFileList(list.text);
  } catch {
    refuse(
      'the file list is neither one path per line nor a JSON array of path strings.',
    );
  }
}
const requested = parsed.all
  ? await ecmascriptStructureAdapter.discoverSourceFiles(root)
  : [...parsed.files, ...listed];
const { records, rejected, unreadable } = await extractFileFacts(
  root,
  requested,
  normalizeCommand(argv, root, process.cwd()),
);
writeFileAtomicallySync(out, `${JSON.stringify(records)}\n`);
process.stdout.write(
  `${JSON.stringify({
    files: records.length,
    toolErrors: records.filter(({ toolError }) => toolError).length,
    rejected: rejected.length,
    unreadable: unreadable.length,
    unreadablePaths: unreadable.slice(0, UNREADABLE_PATH_LIMIT),
    output: out,
    elapsedMs: Date.now() - started,
  })}\n`,
);
