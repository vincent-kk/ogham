import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AGY_HOOKS_PATH,
  AGY_MCP_CONFIG_PATH,
  CODEX_HOOKS_PATH,
  CODEX_MANIFEST_PATH,
  CODEX_MARKETPLACE_PATH,
  CODEX_SKILLS_DIR,
  ROOT_MANIFEST_PATH,
} from "../constants/adapterPaths.js";
import {
  AGENTS_DIRECTORY,
  CLAUDE_HOOKS_PATH,
  CLAUDE_MANIFEST_PATH,
  CLAUDE_MARKETPLACE_PATH,
  CLAUDE_MCP_PATH,
  PLUGINS_DIRECTORY,
  SKILLS_DIRECTORY,
} from "../constants/claudeArtifacts.js";

/**
 * `plugin:adapters:check` only ever runs inside a CI run, and a run only starts
 * for paths the workflow's `paths` filter names. A canonical file or an adapter
 * file outside that filter drifts with no run to catch it, so this spec pins both
 * sides of the generator against the filter the workflow actually declares.
 */
const WORKFLOW = readFileSync(
  join(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."),
    ".github/workflows/ci.yml",
  ),
  "utf8",
);

/** Representative plugin the sample paths are built under. */
const PLUGIN_ROOT = `${PLUGINS_DIRECTORY}/entrez`;

/** Canonical files the generator reads — editing one must start a CI run. */
const CANONICAL_SAMPLES = [
  `${PLUGIN_ROOT}/${SKILLS_DIRECTORY}/search/SKILL.md`,
  `${PLUGIN_ROOT}/${SKILLS_DIRECTORY}/search/references/intent-classification.md`,
  `${PLUGIN_ROOT}/${AGENTS_DIRECTORY}/paper-search-expert.md`,
  `${PLUGIN_ROOT}/${CLAUDE_MANIFEST_PATH}`,
  `${PLUGIN_ROOT}/${CLAUDE_MCP_PATH}`,
  `${PLUGIN_ROOT}/${CLAUDE_HOOKS_PATH}`,
  CLAUDE_MARKETPLACE_PATH,
];

/** Adapter files the generator writes — a drifted one must start a CI run. */
const ADAPTER_SAMPLES = [
  `${PLUGIN_ROOT}/${CODEX_SKILLS_DIR}/search/SKILL.md`,
  `${PLUGIN_ROOT}/${CODEX_SKILLS_DIR}/.shared/personas/paper-search-expert.md`,
  `${PLUGIN_ROOT}/${ROOT_MANIFEST_PATH}`,
  `${PLUGIN_ROOT}/${CODEX_MANIFEST_PATH}`,
  `${PLUGIN_ROOT}/${AGY_MCP_CONFIG_PATH}`,
  `${PLUGIN_ROOT}/${AGY_HOOKS_PATH}`,
  `${PLUGIN_ROOT}/${CODEX_HOOKS_PATH}`,
  CODEX_MARKETPLACE_PATH,
];

/**
 * GitHub Actions filter syntax translated to RegExp source. A doubled star spans
 * slashes, a single star and a question mark stop at one. The trailing-slash form
 * also matches zero directories, so a leading-wildcard pattern covers a
 * repository-root file as well as a nested one.
 */
const GLOB_TOKENS = {
  "**/": "(?:.*/)?",
  "**": ".*",
  "*": "[^/]*",
  "?": "[^/]",
} as const;

/**
 * Wildcards first so the trailing-slash form wins over the bare doubled star;
 * the trailing class carries the RegExp metacharacters that must be escaped.
 * One pass only — translating in sequential passes would rewrite the output of
 * an earlier one.
 */
const GLOB_TOKEN_PATTERN = /\*\*\/|\*\*|\*|\?|[.+^${}()|[\]\\]/g;

/**
 * Extracts the quoted `paths` entries of one workflow trigger.
 *
 * @param event - Two-space-indented trigger key, e.g. `push`.
 * @returns The filter patterns in declaration order, empty when the key is absent.
 */
function readPathFilters(event: string): string[] {
  const afterEvent = WORKFLOW.split(`\n  ${event}:\n`)[1] ?? "";
  const block = afterEvent.split(/\n(?:\w| {2}\w)/)[0];
  return [...block.matchAll(/- "([^"]+)"/g)].map((match) => match[1]);
}

/**
 * Lists the paths no filter would match — the empty array is the passing shape.
 *
 * @param paths - Forward-slash paths from the repository root.
 * @param filters - Patterns in GitHub Actions filter syntax.
 * @returns Every input path that would start no CI run.
 */
function findUncovered(paths: string[], filters: string[]): string[] {
  const toRegExp = (filter: string) =>
    new RegExp(
      `^${filter.replace(
        GLOB_TOKEN_PATTERN,
        (token) =>
          GLOB_TOKENS[token as keyof typeof GLOB_TOKENS] ?? `\\${token}`,
      )}$`,
    );
  const matchers = filters.map(toRegExp);
  return paths.filter(
    (path) => !matchers.some((matcher) => matcher.test(path)),
  );
}

describe("ci trigger coverage", () => {
  // --- the translation this spec rests on ---

  it("spans slashes for a doubled star and stops at one for a single star", () => {
    const path = ["plugins/a/skills/b/SKILL.md"];
    expect(findUncovered(path, ["**/skills/**"])).toEqual([]);
    expect(findUncovered(path, ["*/skills/*"])).toEqual(path);
  });

  // --- the two hand-kept copies ---

  it("keeps the push and pull_request path lists identical", () => {
    const filters = readPathFilters("push");
    expect(filters.length).toBeGreaterThan(0);
    expect(readPathFilters("pull_request")).toEqual(filters);
  });

  // --- both sides of the generator ---

  it("triggers on every canonical source the generator reads", () => {
    expect(
      findUncovered(CANONICAL_SAMPLES, readPathFilters("pull_request")),
    ).toEqual([]);
  });

  it("triggers on every adapter the generator writes", () => {
    expect(
      findUncovered(ADAPTER_SAMPLES, readPathFilters("pull_request")),
    ).toEqual([]);
  });
});
