import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./mcp-servers/yt-dlp-mcp",
      "./plugins/atlassian",
      "./plugins/cennad",
      "./plugins/deilen",
      "./plugins/filid",
      "./plugins/imbas",
      "./plugins/maencof",
      "./plugins/maencof-lens",
      "./shared/cross-platform",
      "./shared/http-guard",
      "./shared/session-finalizer",
      "./tools/plugin-compiler",
    ],
  },
});
