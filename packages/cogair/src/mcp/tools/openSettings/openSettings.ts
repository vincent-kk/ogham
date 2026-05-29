import { rm } from 'node:fs/promises';

import { openBrowser } from '@ogham/cross-platform/launcher';

import { SETTINGS_SERVER_PATH } from '../../../constants/paths.js';

import { loadSettingsHtml } from './utils/loadSettingsHtml.js';
import { persistState } from './utils/persistState.js';
import {
  type SettingsServerInstance,
  startSettingsServer,
} from './webServer/index.js';

export interface OpenSettingsInput {}

export interface OpenSettingsOutput {
  url: string;
  message: string;
  reused: boolean;
}

let currentServer: SettingsServerInstance | null = null;

export async function handleOpenSettings(
  _input: OpenSettingsInput,
): Promise<OpenSettingsOutput> {
  if (currentServer) {
    return {
      url: currentServer.url,
      message: 'Reusing the existing cogair settings server',
      reused: true,
    };
  }

  const handle = await startSettingsServer({
    settingsHtml: loadSettingsHtml(),
    onClose: async () => {
      currentServer = null;
      await rm(SETTINGS_SERVER_PATH, { force: true });
    },
  });

  currentServer = handle;
  await persistState(handle);
  openBrowser(handle.url);

  return {
    url: handle.url,
    message: 'cogair settings server started',
    reused: false,
  };
}
