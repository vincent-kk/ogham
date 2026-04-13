interface SetupParams {
  mode?: 'new' | 'edit';
  prefill?: Record<string, unknown>;
}

interface SetupResult {
  success: boolean;
  message: string;
  url?: string;
}

/** Setup tool handler — launches local web server for auth configuration */
export async function handleSetup(params: SetupParams): Promise<SetupResult> {
  // Setup UI will be implemented with a local HTTP server in a later iteration.
  // For now, return instructions for manual configuration.
  const mode = params.mode ?? 'new';

  return {
    success: true,
    message: `Setup mode: ${mode}. Local web server for auth configuration will be available in a future update. Configure manually via ~/.claude/plugins/atlassian/config.json`,
  };
}
