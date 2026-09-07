import type { PROJECT_SETUP_ACTIONS } from '../../../../constants/mcpContracts.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type { OpenSettingsOutput } from '../openSettings/index.js';
import type { RuleDocsSyncOutput } from '../ruleDocsSync/index.js';

/** Action-discriminated input accepted by the public project-setup tool. */
export type ProjectSetupInput =
  | {
      action: typeof PROJECT_SETUP_ACTIONS.INIT;
      path?: string;
      language?: string;
      adapterIds?: string[];
    }
  | { action: typeof PROJECT_SETUP_ACTIONS.RULES_STATUS; path: string }
  | { action: typeof PROJECT_SETUP_ACTIONS.RULES_MANIFEST; path: string }
  | {
      action: typeof PROJECT_SETUP_ACTIONS.RULES_SYNC;
      path: string;
      selections?: Record<string, boolean> | string | null;
      resync?: string[] | string | null;
    }
  | {
      action: typeof PROJECT_SETUP_ACTIONS.SETTINGS;
      path?: string;
      waitSeconds?: number;
    };

/** Stable summary returned by the initialization action. */
export interface ProjectInitSummary {
  created: boolean;
  configPath: string;
}

/** Detailed result returned by one child rule-document action. */
export type RuleDocsSyncData = RuleDocsSyncOutput;

/** Stable settings-session summary returned by the settings action. */
export type OpenSettingsSummary = OpenSettingsOutput;

/** Existing child payload variants returned by project-setup actions. */
export type ProjectSetupResult =
  | ToolPayload<ProjectInitSummary, never>
  | ToolPayload<Record<string, string | number>, RuleDocsSyncData>
  | ToolPayload<OpenSettingsSummary, never>;
