import { portableJoin, portableResolve } from '@ogham/cross-platform/paths';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RULE_DOC_ACTIONS } from '../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { handleOpenSettingsTool } from '../handlers/handleOpenSettingsTool.js';
import { handleProjectInitTool } from '../handlers/handleProjectInitTool.js';
import { handleRuleDocsSyncTool } from '../handlers/handleRuleDocsSyncTool.js';

const RAW_TOOL_HANDLERS = vi.hoisted(() => ({
  handleOpenSettings: vi.fn(),
  handleProjectInit: vi.fn(),
  handleRuleDocsSync: vi.fn(),
}));

vi.mock('../../tools/index.js', () => RAW_TOOL_HANDLERS);

const PROJECT_ROOT_INPUT = 'C:\\workspace\\filid\\nested\\..';
const PROJECT_ROOT = portableResolve(PROJECT_ROOT_INPUT);
const CONFIG_PATH = portableJoin(PROJECT_ROOT, '.filid', 'config.json');
const LANGUAGE = 'Korean';
const ADAPTER_ID = 'codex';
const OPTIONAL_RULE_ID = 'optional-rule';
const REQUIRED_RULE_ID = 'required-rule';
const RULE_DOC_FILENAME = 'filid_rule.md';
const MANIFEST_VERSION = '1';
const FIXTURE_REASON = 'fixture';
const RULE_DOC_PLUGIN_ROOT_UNRESOLVED_CODE = 'rule-docs-plugin-root-unresolved';
const RULE_DOC_PLUGIN_ROOT_UNRESOLVED_MESSAGE =
  'Filid plugin root could not be resolved.';
const MUTATED_DIAGNOSTIC = {
  code: 'mutated-diagnostic',
  message: 'mutated diagnostic',
};
const MUTATED_DIAGNOSTIC_MESSAGE = 'mutated diagnostic message';
const SETTINGS_URL = 'http://127.0.0.1:3000/';
const SETTINGS_MESSAGE = 'settings result';
const EMPTY_DIAGNOSTICS: never[] = [];

const PROJECT_INIT_INPUT = {
  path: PROJECT_ROOT_INPUT,
  language: LANGUAGE,
  adapterIds: [ADAPTER_ID],
};
const CANONICAL_PROJECT_INIT_INPUT = {
  ...PROJECT_INIT_INPUT,
  path: PROJECT_ROOT,
};
const PROJECT_INIT_OUTPUT = {
  configCreated: true,
  filePath: { config: CONFIG_PATH },
};
const PROJECT_INIT_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: {
    created: PROJECT_INIT_OUTPUT.configCreated,
    configPath: CONFIG_PATH,
  },
  diagnostics: EMPTY_DIAGNOSTICS,
};

const RULE_STATUS_INPUT = {
  action: RULE_DOC_ACTIONS.STATUS,
  path: PROJECT_ROOT_INPUT,
};
const RULE_STATUS_OUTPUT = {
  action: RULE_DOC_ACTIONS.STATUS,
  status: {
    entries: [{ id: OPTIONAL_RULE_ID, deployed: true }],
    autoDeployed: [{ id: REQUIRED_RULE_ID, deployed: false }],
    pluginRootResolved: true,
    manifestPath: null,
  },
};
const RULE_STATUS_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: {
    action: RULE_DOC_ACTIONS.STATUS,
    optional: 1,
    required: 1,
    deployed: 1,
  },
  data: RULE_STATUS_OUTPUT,
  diagnostics: EMPTY_DIAGNOSTICS,
};
const UNRESOLVED_RULE_STATUS_OUTPUT = {
  action: RULE_DOC_ACTIONS.STATUS,
  status: {
    entries: [],
    autoDeployed: [],
    pluginRootResolved: false,
    manifestPath: null,
  },
};
const UNRESOLVED_RULE_STATUS_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.UNSUPPORTED,
  summary: {
    action: RULE_DOC_ACTIONS.STATUS,
    optional: 0,
    required: 0,
    deployed: 0,
  },
  data: UNRESOLVED_RULE_STATUS_OUTPUT,
  diagnostics: [
    {
      code: RULE_DOC_PLUGIN_ROOT_UNRESOLVED_CODE,
      message: RULE_DOC_PLUGIN_ROOT_UNRESOLVED_MESSAGE,
    },
  ],
};

const RULE_MANIFEST_INPUT = {
  action: RULE_DOC_ACTIONS.MANIFEST,
  path: PROJECT_ROOT_INPUT,
};
const RULE_MANIFEST_OUTPUT = {
  action: RULE_DOC_ACTIONS.MANIFEST,
  pluginRootResolved: true,
  manifest: {
    version: MANIFEST_VERSION,
    rules: [{ id: OPTIONAL_RULE_ID }, { id: REQUIRED_RULE_ID }],
  },
  skipped: [{ id: REQUIRED_RULE_ID, reason: FIXTURE_REASON }],
};
const RULE_MANIFEST_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: {
    action: RULE_DOC_ACTIONS.MANIFEST,
    rules: 2,
    skipped: 1,
  },
  data: RULE_MANIFEST_OUTPUT,
  diagnostics: EMPTY_DIAGNOSTICS,
};
const UNRESOLVED_RULE_MANIFEST_OUTPUT = {
  action: RULE_DOC_ACTIONS.MANIFEST,
  pluginRootResolved: false,
  manifest: {
    version: '',
    rules: [],
  },
  skipped: [
    {
      id: '*',
      reason: 'plugin root could not be resolved',
    },
  ],
};
const UNRESOLVED_RULE_MANIFEST_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.UNSUPPORTED,
  summary: {
    action: RULE_DOC_ACTIONS.MANIFEST,
    rules: 0,
    skipped: 1,
  },
  data: UNRESOLVED_RULE_MANIFEST_OUTPUT,
  diagnostics: [
    {
      code: RULE_DOC_PLUGIN_ROOT_UNRESOLVED_CODE,
      message: RULE_DOC_PLUGIN_ROOT_UNRESOLVED_MESSAGE,
    },
  ],
};

const RULE_SYNC_INPUT = {
  action: RULE_DOC_ACTIONS.SYNC,
  path: PROJECT_ROOT_INPUT,
  selections: { [OPTIONAL_RULE_ID]: true },
  resync: [OPTIONAL_RULE_ID],
};
const RULE_SYNC_OUTPUT = {
  action: RULE_DOC_ACTIONS.SYNC,
  result: {
    copied: [RULE_DOC_FILENAME],
    removed: [],
    unchanged: [RULE_DOC_FILENAME],
    updated: [RULE_DOC_FILENAME],
    drift: [RULE_DOC_FILENAME],
    skipped: [{ id: REQUIRED_RULE_ID, reason: FIXTURE_REASON }],
  },
  selections: { [OPTIONAL_RULE_ID]: true },
  resync: [OPTIONAL_RULE_ID],
};
const RULE_SYNC_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: {
    action: RULE_DOC_ACTIONS.SYNC,
    created: 1,
    updated: 1,
    removed: 0,
    skipped: 1,
    drift: 1,
  },
  data: RULE_SYNC_OUTPUT,
  diagnostics: EMPTY_DIAGNOSTICS,
};
const CANONICAL_RULE_SYNC_INPUT = {
  ...RULE_SYNC_INPUT,
  path: PROJECT_ROOT,
};

const OPEN_SETTINGS_INPUT = {
  path: PROJECT_ROOT_INPUT,
  waitSeconds: 10,
};
const CANONICAL_OPEN_SETTINGS_INPUT = {
  ...OPEN_SETTINGS_INPUT,
  path: PROJECT_ROOT,
};
const OPEN_SETTINGS_EXTRA = {
  signal: new AbortController().signal,
};
const SAVED_OPEN_SETTINGS_OUTPUT = {
  status: 'saved',
  url: SETTINGS_URL,
  summary: {
    configWritten: true,
    ruleDocs: {
      copied: [],
      removed: [],
      unchanged: [],
      updated: [],
      drift: [],
      skipped: [],
    },
  },
  message: SETTINGS_MESSAGE,
} as const;
const CLOSED_OPEN_SETTINGS_OUTPUT = {
  status: 'closed',
  url: SETTINGS_URL,
  message: SETTINGS_MESSAGE,
} as const;
const PENDING_OPEN_SETTINGS_OUTPUT = {
  status: 'pending',
  url: SETTINGS_URL,
  message: SETTINGS_MESSAGE,
} as const;
const SAVED_OPEN_SETTINGS_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: SAVED_OPEN_SETTINGS_OUTPUT,
  diagnostics: EMPTY_DIAGNOSTICS,
};
const CLOSED_OPEN_SETTINGS_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: CLOSED_OPEN_SETTINGS_OUTPUT,
  diagnostics: EMPTY_DIAGNOSTICS,
};
const PENDING_OPEN_SETTINGS_PAYLOAD = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: PENDING_OPEN_SETTINGS_OUTPUT,
  diagnostics: EMPTY_DIAGNOSTICS,
};
beforeEach(() => {
  vi.clearAllMocks();
});

describe('legacy MCP tool payload adapters', () => {
  it('summarizes project initialization at the canonical root', () => {
    RAW_TOOL_HANDLERS.handleProjectInit.mockReturnValue(PROJECT_INIT_OUTPUT);

    expect(handleProjectInitTool(PROJECT_INIT_INPUT)).toEqual(
      PROJECT_INIT_PAYLOAD,
    );
    expect(RAW_TOOL_HANDLERS.handleProjectInit).toHaveBeenCalledWith(
      CANONICAL_PROJECT_INIT_INPUT,
    );
  });

  it('summarizes rule document status and preserves raw data', () => {
    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(RULE_STATUS_OUTPUT);

    expect(handleRuleDocsSyncTool(RULE_STATUS_INPUT)).toEqual(
      RULE_STATUS_PAYLOAD,
    );
  });

  it('reports unresolved rule document status as unsupported', () => {
    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(
      UNRESOLVED_RULE_STATUS_OUTPUT,
    );

    expect(handleRuleDocsSyncTool(RULE_STATUS_INPUT)).toEqual(
      UNRESOLVED_RULE_STATUS_PAYLOAD,
    );
  });

  it('summarizes the rule manifest and preserves raw data', () => {
    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(RULE_MANIFEST_OUTPUT);

    expect(handleRuleDocsSyncTool(RULE_MANIFEST_INPUT)).toEqual(
      RULE_MANIFEST_PAYLOAD,
    );
  });

  it('reports an unresolved rule manifest as unsupported', () => {
    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(
      UNRESOLVED_RULE_MANIFEST_OUTPUT,
    );

    expect(handleRuleDocsSyncTool(RULE_MANIFEST_INPUT)).toEqual(
      UNRESOLVED_RULE_MANIFEST_PAYLOAD,
    );
  });

  it('returns fresh diagnostic arrays without shared mutable entries', () => {
    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(RULE_STATUS_OUTPUT);
    const resolved = handleRuleDocsSyncTool(RULE_STATUS_INPUT);
    resolved.diagnostics.push(MUTATED_DIAGNOSTIC);
    const nextResolved = handleRuleDocsSyncTool(RULE_STATUS_INPUT);

    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(
      UNRESOLVED_RULE_STATUS_OUTPUT,
    );
    const unresolved = handleRuleDocsSyncTool(RULE_STATUS_INPUT);
    if (unresolved.diagnostics[0])
      unresolved.diagnostics[0].message = MUTATED_DIAGNOSTIC_MESSAGE;
    const nextUnresolved = handleRuleDocsSyncTool(RULE_STATUS_INPUT);

    expect(nextResolved.diagnostics).toEqual([]);
    expect(nextUnresolved.diagnostics).toEqual(
      UNRESOLVED_RULE_STATUS_PAYLOAD.diagnostics,
    );
  });

  it('summarizes rule synchronization counts and preserves raw data', () => {
    RAW_TOOL_HANDLERS.handleRuleDocsSync.mockReturnValue(RULE_SYNC_OUTPUT);

    expect(handleRuleDocsSyncTool(RULE_SYNC_INPUT)).toEqual(RULE_SYNC_PAYLOAD);
    expect(RAW_TOOL_HANDLERS.handleRuleDocsSync).toHaveBeenCalledWith(
      CANONICAL_RULE_SYNC_INPUT,
    );
  });

  // Rows stay inline: a table referenced through a name cannot be counted
  // statically, and one such file turns the whole verification analysis
  // indeterminate (filid_verification-records §3).
  it.each([
    {
      status: SAVED_OPEN_SETTINGS_OUTPUT.status,
      raw: SAVED_OPEN_SETTINGS_OUTPUT,
      payload: SAVED_OPEN_SETTINGS_PAYLOAD,
    },
    {
      status: CLOSED_OPEN_SETTINGS_OUTPUT.status,
      raw: CLOSED_OPEN_SETTINGS_OUTPUT,
      payload: CLOSED_OPEN_SETTINGS_PAYLOAD,
    },
    {
      status: PENDING_OPEN_SETTINGS_OUTPUT.status,
      raw: PENDING_OPEN_SETTINGS_OUTPUT,
      payload: PENDING_OPEN_SETTINGS_PAYLOAD,
    },
  ])(
    'preserves the $status open-settings result as its summary',
    async ({ raw, payload }) => {
      RAW_TOOL_HANDLERS.handleOpenSettings.mockResolvedValue(raw);

      await expect(
        handleOpenSettingsTool(OPEN_SETTINGS_INPUT, OPEN_SETTINGS_EXTRA),
      ).resolves.toEqual(payload);
      expect(RAW_TOOL_HANDLERS.handleOpenSettings).toHaveBeenCalledWith(
        CANONICAL_OPEN_SETTINGS_INPUT,
        OPEN_SETTINGS_EXTRA,
      );
    },
  );
});
