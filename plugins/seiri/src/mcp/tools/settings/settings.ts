import { openSettingsPage } from './handlers/openSettingsPage.js';
import { syncRuleDocs } from './handlers/syncRuleDocs.js';
import type {
  SettingsInput,
  SettingsOutput,
  SettingsToolExtra,
} from './types/settingsContract.js';

/** Dispatch the unified settings surface by its explicit action. */
export async function handleSettings(
  input: SettingsInput,
  extra?: SettingsToolExtra,
): Promise<SettingsOutput> {
  if (input.action === 'open') return openSettingsPage(input, extra);
  return syncRuleDocs(input);
}
