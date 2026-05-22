import { SETTINGS_SERVER_PATH } from '../../../../constants/paths.js';
import { atomicWrite } from '../../../../lib/atomicWrite.js';
import { isoNow } from '../../../../utils/isoNow.js';
import type { SettingsServerInstance } from '../webServer/index.js';

export async function persistState(
  handle: SettingsServerInstance,
): Promise<void> {
  const now = isoNow();
  await atomicWrite(
    SETTINGS_SERVER_PATH,
    `${JSON.stringify(
      {
        url: handle.url,
        port: handle.port,
        pid: process.pid,
        started_at: now,
        last_activity_at: now,
      },
      null,
      2,
    )}\n`,
  );
}
