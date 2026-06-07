import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./plugins/atlassian",
      "./plugins/cogair",
      "./plugins/filid",
      "./plugins/imbas",
      "./plugins/maencof",
      "./plugins/maencof-lens",
      "./shared/cross-platform",
    ],
  },
});
