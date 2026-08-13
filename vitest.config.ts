import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./mcp-servers/yt-dlp-mcp",
      "./plugins/atlassian",
      "./plugins/cennad",
      "./plugins/deilen",
      "./plugins/entrez",
      "./plugins/filid",
      "./plugins/imbas",
      "./plugins/maencof",
      "./plugins/maencof-lens",
      "./plugins/r-statistics",
      "./plugins/seiri",
      "./shared/agent-artifacts",
      "./shared/cross-platform",
      "./shared/http-kit",
      "./shared/session-finalizer",
      "./tools/plugin-compiler",
    ],
  },
});
