/**
 * @file settings.ts
 * @description Zod schemas and types for the open_settings page contract
 */
import type { ConfigScopeState } from '@ogham/cross-platform';
import { z } from 'zod';

import { ImbasConfigSchema } from './config.js';
import type { ImbasConfig, Provider } from './config.js';

/** Session-known facts the LLM injects when opening the settings page. */
export const SettingsBootstrapSchema = z.object({
  providers: z
    .object({
      jira: z.boolean().optional(),
      github: z.boolean().optional(),
    })
    .optional()
    .describe('Remote tool availability detected by the session health check.'),
  jira_projects: z
    .array(z.object({ key: z.string(), name: z.string().optional() }))
    .optional()
    .describe('Jira projects fetched in-session for the project picker.'),
  github_repo: z
    .string()
    .optional()
    .describe('owner/repo detected from the current git remote.'),
});
export type SettingsBootstrap = z.infer<typeof SettingsBootstrapSchema>;

/** State injected into the settings page as `__IMBAS_STATE__`. */
export interface SettingsPageState {
  projectRoot: string;
  configExists: boolean;
  /**
   * The config each layer resolves to. The page seats its form — and starts
   * its save document — from the one the toggle names, so a save under `user`
   * never carries the project layer's overrides back into the user file.
   * `project` is the effective merge; `user` is that layer alone.
   */
  configByScope: {
    user: ImbasConfig;
    project: ImbasConfig;
  };
  /** Per-layer raw documents and the dot paths the project layer overrode. */
  scope: ConfigScopeState;
  suggestedLocalKey: string;
  bootstrap: SettingsBootstrap;
}

/**
 * POST /save body. `config` replaces the named layer wholesale; `options`
 * carries page-level intents that are not config (e.g. GitHub label
 * provisioning, executed by the setup skill after save).
 *
 * `scope` is required rather than defaulted: the page always knows which
 * layer it is editing, and a silent default would write the wrong file.
 */
export const SettingsSaveBodySchema = z.object({
  scope: z.enum(['user', 'project']),
  config: ImbasConfigSchema,
  options: z
    .object({ provision_labels: z.boolean().default(false) })
    .default({ provision_labels: false }),
});
export type SettingsSaveBody = z.infer<typeof SettingsSaveBodySchema>;

/** Summary carried by a `saved` settle event and the tool response. */
export interface SettingsSaveSummary {
  configWritten: boolean;
  provider: Provider;
  projectRef: string | null;
  provisionLabels: boolean;
}

/** Outcome of one bounded wait on the settings session. */
export type SettingsSettleEvent =
  | { kind: 'saved'; summary: SettingsSaveSummary }
  | { kind: 'closed' }
  | { kind: 'pending' };
