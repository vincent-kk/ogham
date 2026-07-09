/**
 * @file types.ts
 * @description vaultRedirector 훅 I/O 타입 (PreToolUse 입력/결과).
 */
export interface VaultRedirectorInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    path?: string;
    pattern?: string;
    [key: string]: unknown;
  };
  cwd?: string;
}

export interface VaultRedirectorResult {
  continue: true;
  hookSpecificOutput?: {
    hookEventName: 'PreToolUse';
    additionalContext?: string;
  };
}
