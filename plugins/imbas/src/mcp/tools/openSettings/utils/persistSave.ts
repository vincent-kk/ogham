import { saveConfig } from '../../../../core/configManager/configManager.js';
import type {
  SettingsSaveBody,
  SettingsSaveSummary,
} from '../../../../types/settings.js';

/**
 * Persist one settings-page save: atomically write `.imbas/config.json` and
 * summarize the page-level intents for the setup skill (label provisioning
 * runs in-session after the tool returns, not here).
 */
export async function persistSave(
  projectRoot: string,
  body: SettingsSaveBody,
): Promise<SettingsSaveSummary> {
  await saveConfig(projectRoot, body.config);
  return {
    configWritten: true,
    provider: body.config.provider,
    projectRef: body.config.defaults.project_ref,
    provisionLabels: body.options.provision_labels,
  };
}
