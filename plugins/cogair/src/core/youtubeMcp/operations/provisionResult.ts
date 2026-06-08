// Outcome of provisioning the yt-dlp-mcp MCP server into one target CLI.
// Shared by the antigravity (file-write) and codex (`codex mcp`) provisioners.
export type ProvisionAction = 'added' | 'removed' | 'unchanged';

export interface ProvisionResult {
  ok: boolean;
  action: ProvisionAction;
}
