export interface OpenSettingsInput {}

export interface OpenSettingsOutput {
  url: string;
  message: string;
  reused: boolean;
}

export async function handleOpenSettings(
  _input: OpenSettingsInput,
): Promise<OpenSettingsOutput> {
  return {
    url: '',
    message:
      'open_settings is a Phase 4 placeholder; the cogair settings web UI ships in Phase 5.',
    reused: false,
  };
}
