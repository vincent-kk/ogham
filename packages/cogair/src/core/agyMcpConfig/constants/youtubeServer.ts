// The MCP server cogair provisions into agy's mcp_config.json to give the
// Antigravity CLI native YouTube transcript access. agy invokes this tool on its
// own in headless `-p` mode (verified against agy 1.0.6), so cogair's dispatch
// path stays unchanged — it only ensures the server is registered.
//
// Mirrors the user-validated entry: `npx -y @kimtaeyoon83/mcp-server-youtube-transcript`.
export const ANTIGRAVITY_YOUTUBE_MCP_KEY = 'youtube-transcript';

export const ANTIGRAVITY_YOUTUBE_MCP_SERVER = {
  command: 'npx',
  args: ['-y', '@kimtaeyoon83/mcp-server-youtube-transcript'],
} as const;
