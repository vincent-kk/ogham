import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { BUILTIN_RULE_SEVERITIES } from '../../../../constants/builtinRuleSeverities.js';
import {
  type FilidConfigFile,
  createDefaultConfig,
  loadConfig,
  loadConfigByScope,
  loadConfigScope,
  writeConfig,
} from '../../../../core/infra/configLoader/index.js';

const RULE = 'max-depth';

let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'filid-settings-rules-'));
});

afterEach(() => {
  rmSync(loadConfigScope(projectRoot).paths.user, { force: true });
  rmSync(projectRoot, { recursive: true, force: true });
});

/**
 * The page's own row-to-entry function, evaluated against injected state.
 *
 * @param state The `state` global the server injects into the page.
 * @param configByScope Both layers' normalized configs, as the page holds them.
 * @param scope The layer the scope toggle names.
 * @returns The page's `ruleEntry` function.
 */
function pageRuleEntry(
  state: unknown,
  configByScope: unknown,
  scope: string,
): (
  id: string,
  enabled: boolean,
  severity: string,
  exempt: string[],
) => FilidConfigFile['rules'][string] | undefined {
  const app = readFileSync(
    join(import.meta.dirname, '..', 'scripts/app.js'),
    'utf8',
  );
  const helpers = app.slice(
    app.indexOf('function ruleBaseline('),
    app.indexOf('function collectConfig()'),
  );
  return runInNewContext(helpers + ';ruleEntry', {
    state,
    configByScope,
    scope,
  });
}

it('re-enables on the project layer a rule the user layer disabled', () => {
  writeConfig(projectRoot, 'user', {
    ...createDefaultConfig(),
    rules: { [RULE]: 'off' },
  });
  const byScope = loadConfigByScope(projectRoot);
  expect(byScope.project.config?.rules[RULE]?.enabled).toBe(false);

  const ruleEntry = pageRuleEntry(
    { ruleDefaults: { [RULE]: { severity: BUILTIN_RULE_SEVERITIES[RULE] } } },
    { user: byScope.user.config, project: byScope.project.config },
    'project',
  );
  const entry = ruleEntry(RULE, true, BUILTIN_RULE_SEVERITIES[RULE], []);
  expect(entry).toEqual({ enabled: true });
  if (entry === undefined) throw new Error('the row must write an override');

  writeConfig(projectRoot, 'project', {
    ...createDefaultConfig(),
    rules: { [RULE]: entry },
  });
  expect(loadConfig(projectRoot).config?.rules[RULE]?.enabled).toBe(true);
});
