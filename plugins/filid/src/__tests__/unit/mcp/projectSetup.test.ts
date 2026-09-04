import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PROJECT_SETUP_ACTIONS,
  RULE_DOC_ACTIONS,
} from '../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { handleProjectSetup } from '../../../mcp/tools/projectSetup/index.js';

const CHILD_HANDLERS = vi.hoisted(() => ({
  init: vi.fn(),
  rules: vi.fn(),
  settings: vi.fn(),
}));

vi.mock('../../../mcp/tools/projectSetup/projectInit/index.js', () => ({
  handleProjectInit: CHILD_HANDLERS.init,
}));
vi.mock('../../../mcp/tools/projectSetup/ruleDocsSync/index.js', () => ({
  handleRuleDocsSync: CHILD_HANDLERS.rules,
}));
vi.mock('../../../mcp/tools/projectSetup/openSettings/index.js', () => ({
  handleOpenSettings: CHILD_HANDLERS.settings,
}));

const PROJECT_ROOT = '/project';
const CONFIG_PATH = '/project/.filid/config.json';
const EMPTY_DIAGNOSTICS: never[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('project-setup action dispatcher', () => {
  it('dispatches init and preserves its summary', async () => {
    CHILD_HANDLERS.init.mockReturnValue({
      configCreated: true,
      filePath: { config: CONFIG_PATH },
    });

    const result = await handleProjectSetup({
      action: PROJECT_SETUP_ACTIONS.INIT,
      path: PROJECT_ROOT,
      language: 'Korean',
      adapterIds: ['ecmascript'],
    });

    expect(result).toEqual({
      projectRoot: PROJECT_ROOT,
      status: TOOL_STATUSES.OK,
      summary: { created: true, configPath: CONFIG_PATH },
      diagnostics: EMPTY_DIAGNOSTICS,
    });
  });

  it('maps rules-status to the child status action', async () => {
    const output = {
      action: RULE_DOC_ACTIONS.STATUS,
      status: {
        entries: [],
        autoDeployed: [],
        pluginRootResolved: true,
        manifestPath: null,
      },
    };
    CHILD_HANDLERS.rules.mockReturnValue(output);

    const result = await handleProjectSetup({
      action: PROJECT_SETUP_ACTIONS.RULES_STATUS,
      path: PROJECT_ROOT,
    });

    expect(CHILD_HANDLERS.rules).toHaveBeenCalledWith({
      action: RULE_DOC_ACTIONS.STATUS,
      path: PROJECT_ROOT,
      selections: undefined,
      resync: undefined,
    });
    expect(result.data).toBe(output);
  });

  it('maps rules-manifest to the child manifest action', async () => {
    const output = {
      action: RULE_DOC_ACTIONS.MANIFEST,
      pluginRootResolved: true,
      manifest: { version: '1', rules: [] },
    };
    CHILD_HANDLERS.rules.mockReturnValue(output);

    const result = await handleProjectSetup({
      action: PROJECT_SETUP_ACTIONS.RULES_MANIFEST,
      path: PROJECT_ROOT,
    });

    expect(CHILD_HANDLERS.rules).toHaveBeenCalledWith({
      action: RULE_DOC_ACTIONS.MANIFEST,
      path: PROJECT_ROOT,
      selections: undefined,
      resync: undefined,
    });
    expect(result.data).toBe(output);
  });

  it('maps rules-sync and preserves selection inputs', async () => {
    const output = {
      action: RULE_DOC_ACTIONS.SYNC,
      result: {
        copied: [],
        updated: [],
        removed: [],
        unchanged: [],
        skipped: [],
        drift: [],
      },
      selections: { boundaries: true },
      resync: ['boundaries'],
    };
    CHILD_HANDLERS.rules.mockReturnValue(output);

    const result = await handleProjectSetup({
      action: PROJECT_SETUP_ACTIONS.RULES_SYNC,
      path: PROJECT_ROOT,
      selections: { boundaries: true },
      resync: ['boundaries'],
    });

    expect(CHILD_HANDLERS.rules).toHaveBeenCalledWith({
      action: RULE_DOC_ACTIONS.SYNC,
      path: PROJECT_ROOT,
      selections: { boundaries: true },
      resync: ['boundaries'],
    });
    expect(result.data).toBe(output);
  });

  it('dispatches settings with the host abort signal', async () => {
    const output = {
      status: 'pending',
      url: 'http://127.0.0.1:3000/',
      message: 'waiting',
    };
    const signal = new AbortController().signal;
    CHILD_HANDLERS.settings.mockResolvedValue(output);

    const result = await handleProjectSetup(
      {
        action: PROJECT_SETUP_ACTIONS.SETTINGS,
        path: PROJECT_ROOT,
        waitSeconds: 10,
      },
      { signal },
    );

    expect(CHILD_HANDLERS.settings).toHaveBeenCalledWith(
      { path: PROJECT_ROOT, waitSeconds: 10 },
      { signal },
    );
    expect(result.summary).toBe(output);
  });
});
