export interface CodexMcpBlockMarkers {
  readonly start: string;
  readonly end: string;
}

export function codexMcpBlockMarkers(
  owner: string,
  name: string,
): CodexMcpBlockMarkers {
  const ownerToken = Buffer.from(owner, "utf8").toString("base64url");
  const nameToken = Buffer.from(name, "utf8").toString("base64url");
  const key = `${ownerToken}:${nameToken}`;
  return {
    start: `# OGHAM-MCP:START:${key}`,
    end: `# OGHAM-MCP:END:${key}`,
  };
}
