#!/usr/bin/env node
/**
 * Build script for hook entry point bundles
 * Bundles each hook into a self-contained ESM file for plugin distribution
 *
 * Output: bridge/<name>.mjs
 *
 * One bundle per Claude Code event: each bridge is a dispatcher that folds that
 * event's concern handlers into a single process (entries live at
 * src/hooks/<event>/<event>.entry.ts).
 *
 * Hook isolation guards: hooks must remain thin scripts (Node builtins only).
 * Pulling external runtimes (zod, fast-glob, MCP SDK) into a hook bundle breaks
 * per-event cold-start budget. Per-event size caps + FORBIDDEN_PATTERNS enforce
 * this at build time. session-start carries an inlined meta-skill-body.md
 * payload so it gets the highest cap.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateWindowsCmd } from '@ogham/cross-platform';
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Meta-skill body budget guard: the SessionStart runtime SKIPS injection when
// the body exceeds META_SKILL_MAX_CHARS, so an oversized body would ship as a
// silently dead feature. Fail the build instead.
{
  const constantsSource = await readFile(
    resolve(root, 'src/constants/sessionStart.ts'),
    'utf8',
  );
  const limitMatch = /META_SKILL_MAX_CHARS\s*=\s*(\d+)/.exec(constantsSource);
  if (!limitMatch)
    throw new Error(
      'build-hooks: cannot read META_SKILL_MAX_CHARS from src/constants/sessionStart.ts',
    );
  const metaSkillLimit = Number(limitMatch[1]);
  const metaSkillBody = await readFile(
    resolve(root, 'src/hooks/sessionStart/helpers/bootstrap/metaSkillBody.md'),
    'utf8',
  );
  const metaSkillCodePoints = [...metaSkillBody].length;
  if (metaSkillCodePoints > metaSkillLimit) {
    console.error(
      `\nMeta-skill body budget exceeded: ${metaSkillCodePoints} code points > META_SKILL_MAX_CHARS ${metaSkillLimit}.\n` +
        'The SessionStart hook would silently skip the dialogue meta-skill at runtime.\n' +
        'Trim src/hooks/sessionStart/helpers/bootstrap/metaSkillBody.md or raise the constant deliberately.',
    );
    process.exit(1);
  }
  console.log(
    `  Meta-skill body budget ok (${metaSkillCodePoints} <= ${metaSkillLimit} code points)`,
  );
}

await mkdir(resolve(root, 'bridge'), { recursive: true });

// Windows .cmd shim — invoked from hooks.json on win32 when PATH lacks node.
// Routes through libs/run.cjs (which uses process.execPath via spawnSync) so
// the actual hook bundle still executes via the same node binary.
generateWindowsCmd({
  outputPath: resolve(root, 'bridge/run-hook.cmd'),
  scriptRelativePath: '../libs/run.cjs',
});
console.log('  Windows hook shim -> bridge/run-hook.cmd');

// Per-event dispatcher bundles: each bridge folds that event's concern handlers
// (+ the lifecycle dispatcher) into one process. Caps reflect the union of those
// concerns' code; the FORBIDDEN_PATTERNS guard below still holds — combining
// clean concerns must not pull zod / fast-glob / MCP SDK.
//   session-start      — sessionStart (selfProbe + inlined meta-skill-body.md
//                        + claudeMd merge + insight stats + full L1 core reader
//                        buildL1CoreBlock + personal-context reader/renderer
//                        <personal-context> block) + lifecycle.
//   user-prompt-submit — contextInjector + insightInjector + lifecycle +
//                        vaultCommitter (spawnCli/git, scope staging +
//                        foldDaily). Includes the companion identity v2 turn
//                        renderer + graceful v1→v2 normalize (normalizeToV2)
//                        reached via buildTurnContext — pure Node-builtin
//                        functions, no external runtime.
//   post-tool-use      — activityRecorder + lifecycle.
//   pre-tool-use       — layerGuard + vaultRedirector + lifecycle (all light).
// session-start is the largest bundle: it inlines metaSkillBody.md and the
// full-L1 reader (buildL1CoreBlock — pure Node-builtin fs reads + frontmatter
// strip). FORBIDDEN_PATTERNS below still enforces the real isolation guard.
// 52 -> 56 KB with the personal-context awareness block (reader + zod-free
// normalizer + renderer, ~4 KB minified). The isolation guarantee stays with
// FORBIDDEN_PATTERNS below — the byte cap only catches accidental module pull.
const SESSION_START_BYTES = 56 * 1024;
// user-prompt-submit carries the per-turn companion binding renderer and the
// graceful v1->v2 identity normalization on the turn path (buildTurnContext)
// — pure Node-builtin functions; the isolation guarantee (no zod / fast-glob
// / MCP SDK) is enforced by FORBIDDEN_PATTERNS below.
// user-prompt-submit / session-end grew with the vaultCommitter scope
// expansion (configurable commit scope + sensitive-file exclude pathspecs +
// daily fold via git reset --soft) — all pure Node-builtin + spawnCli code.
// 40 -> 42 KB with the per-turn session-touch concern (sessionStore day-log
// touch/reopen + usage snapshot, ~1.3 KB minified) that lets the MCP server
// sweep own session finalization after the SessionEnd hook removal.
const USER_PROMPT_SUBMIT_BYTES = 42 * 1024;
const POST_TOOL_USE_BYTES = 12 * 1024;
const PRE_TOOL_USE_BYTES = 12 * 1024;

// `name` is the bridge output basename (kebab — referenced by hooks.json and
// kept stable). `entryPath` is the esbuild entry relative to src/hooks.
const hookEntries = [
  {
    name: 'session-start',
    entryPath: 'sessionStart/sessionStart.entry.ts',
    maxBytes: SESSION_START_BYTES,
  },
  {
    name: 'user-prompt-submit',
    entryPath: 'userPromptSubmit/userPromptSubmit.entry.ts',
    maxBytes: USER_PROMPT_SUBMIT_BYTES,
  },
  {
    name: 'pre-tool-use',
    entryPath: 'preToolUse/preToolUse.entry.ts',
    maxBytes: PRE_TOOL_USE_BYTES,
  },
  {
    name: 'post-tool-use',
    entryPath: 'postToolUse/postToolUse.entry.ts',
    maxBytes: POST_TOOL_USE_BYTES,
  },
];

// user-prompt-submit owns the git vault committer and therefore still bundles
// cross-spawn (CJS). Only that event receives createRequire; adding the banner
// to the three builtin-only events would be dead bytes.
const ESM_CJS_REQUIRE_BANNER =
  "import { createRequire as __cpCreateRequire } from 'node:module';\n" +
  'const require = __cpCreateRequire(import.meta.url);\n';

const hookBuilds = await Promise.all(
  hookEntries.map(async ({ name, entryPath }) => ({
    name,
    result: await esbuild.build({
      entryPoints: [resolve(root, 'src/hooks', entryPath)],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: resolve(root, `bridge/${name}.mjs`),
      minify: true,
      sourcemap: false,
      treeShaking: true,
      metafile: true,
      loader: { '.md': 'text' },
      banner:
        name === 'user-prompt-submit'
          ? { js: ESM_CJS_REQUIRE_BANNER }
          : undefined,
    }),
  })),
);

console.log(`  Hook scripts (${hookEntries.length}) -> bridge/*.mjs`);

const SESSION_START_FORBIDDEN_IMPORT_PATHS = [
  {
    label: 'general instruction manager/planning/apply/status',
    pattern:
      /shared\/agent-artifacts\/(?:src|dist)\/instructions\/(?:instructions\.(?:ts|js)|planning\/|apply\/|status\/|compat\/)/,
  },
  {
    label: 'artifact transactions',
    pattern: /shared\/agent-artifacts\/(?:src|dist)\/transactions\//,
  },
  {
    label: 'filesystem locking',
    pattern: /shared\/cross-platform\/(?:src|dist)\/filesystem\/locking\//,
  },
  {
    label: 'general CLI spawn',
    pattern: /shared\/cross-platform\/(?:src|dist)\/spawn\//,
  },
  {
    label: 'cross-spawn/which runtime',
    pattern: /node_modules\/(?:cross-spawn|which)\//,
  },
];
const sessionStartMetafile = hookBuilds.find(
  ({ name }) => name === 'session-start',
)?.result.metafile;
if (!sessionStartMetafile)
  throw new Error('build-hooks: SessionStart metafile was not generated');
const sessionStartInputs = Object.keys(sessionStartMetafile.inputs).map(
  (input) => input.replaceAll('\\', '/'),
);
const sessionStartImportViolations =
  SESSION_START_FORBIDDEN_IMPORT_PATHS.flatMap(({ label, pattern }) =>
    sessionStartInputs
      .filter((input) => pattern.test(input))
      .map(
        (input) =>
          `  session-start.mjs: forbidden import graph (${label}): ${input}`,
      ),
  );

const HOOK_FORBIDDEN_AGGREGATE_INPUTS = [
  'agent-artifacts/dist/instructions/hook/index.js',
  'cross-platform/dist/hooks/errorLog.js',
  'cross-platform/dist/hostRegistry/index.js',
  'cross-platform/dist/paths/index.js',
  'cross-platform/dist/paths/paths.js',
  'cross-platform/dist/paths/compat/index.js',
  'cross-platform/dist/filesystem/read/index.js',
  'cross-platform/src/filesystem/read/index.ts',
];
const aggregateImportViolations = hookBuilds.flatMap(({ name, result }) =>
  Object.keys(result.metafile.inputs).flatMap((input) => {
    const normalizedInput = input.replaceAll('\\', '/');
    return HOOK_FORBIDDEN_AGGREGATE_INPUTS.flatMap((forbidden) =>
      normalizedInput.includes(forbidden)
        ? [`  ${name}.mjs: forbidden aggregate input graph ${forbidden}`]
        : [],
    );
  }),
);

// agy hook runner (shared — bundled from @ogham/cross-platform, not this
// plugin's src). The emitted agy hooks.json (plugin root, named-group format)
// routes each event through this runner, which translates agy's camelCase
// payload to the Claude contract, runs the same bridge/<event>.mjs handler, and
// translates the reply back. Bundling it here ships it in bridge/ so
// `agy plugin install` distributes it. Contract: tools/plugin-compiler
// buildAgyHooks emits `node bridge/run-agy.mjs <ClaudeEvent> bridge/<handler>.mjs`.
// It pulls only Node builtins (spawnSync + the pure agy-hooks translation), so
// it stays under the light cap and trips no FORBIDDEN_PATTERNS.
const RUN_AGY_HOOK_BYTES = 12 * 1024;
await esbuild.build({
  entryPoints: [
    fileURLToPath(import.meta.resolve('@ogham/cross-platform/agy-runner/main')),
  ],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(root, 'bridge/run-agy.mjs'),
  minify: true,
  sourcemap: false,
  treeShaking: true,
});
console.log('  agy hook runner -> bridge/run-agy.mjs');

const FORBIDDEN_PATTERNS = [
  // Glob family
  /\bfast-glob\b/,
  /@nodelib\b/,
  /\bmicromatch\b/,
  /\bbraces\b/,
  /\bpicomatch\b/,
  /\bminimatch\b/,
  /\bchokidar\b/,
  // Validation runtimes
  /\bZodError\b/,
  /\bZodObject\b/,
  /\bZodType\b/,
  /\bsafeParse\b/,
  /\bAjv\b/,
  // AST / native
  /@ast-grep\/napi/,
  /\btree-sitter\b/,
  // Heavy utility libs
  /\blodash\b/,
  /\bmoment\b/,
  /\bdate-fns\b/,
  // MCP server (long-running) belongs in mcp-server.cjs, never in hooks
  /@modelcontextprotocol\/sdk/,
  // cross-platform heavy helpers — MCP bundle only, never in hook bundle
  /\bbinaries\.discover\b/,
  /\brunHookEntry\b/,
  /\bgenerateWindowsCmd\b/,
];
// NOTE: the generic esbuild CJS require shim remains allowed only because the
// user-prompt vault committer intentionally uses cross-spawn. SessionStart's
// graph guard above separately proves that runtime never reaches that bundle.

const violations = [
  ...sessionStartImportViolations,
  ...aggregateImportViolations,
];

const guardedBundles = [
  ...hookEntries,
  { name: 'run-agy', maxBytes: RUN_AGY_HOOK_BYTES },
];

for (const { name, maxBytes } of guardedBundles) {
  const file = resolve(root, `bridge/${name}.mjs`);
  const { size } = await stat(file);
  if (size > maxBytes) {
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${maxBytes} (${(size / 1024).toFixed(1)} KB > ${(maxBytes / 1024).toFixed(0)} KB)`,
    );
  }
  const content = await readFile(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`  ${name}.mjs: forbidden pattern ${pattern} matched`);
    }
  }
}

if (violations.length > 0) {
  console.error('\nHook bundle isolation violation:');
  for (const v of violations) console.error(v);
  console.error(
    '\nHooks must stay thin (Node builtins only). External runtimes (zod,\n' +
      'fast-glob, MCP SDK, AST tooling) belong in mcp-server.cjs / skill paths,\n' +
      'not in hook bundles. See plugins/maencof/src/types/dialogueConfigGuard.ts\n' +
      'and insightGuard.ts for the zod-free guard pattern.',
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (per-event caps: session-start <= ${SESSION_START_BYTES}, user-prompt-submit <= ${USER_PROMPT_SUBMIT_BYTES}, post-tool-use <= ${POST_TOOL_USE_BYTES}, pre-tool-use <= ${PRE_TOOL_USE_BYTES} bytes, no forbidden modules)`,
);
