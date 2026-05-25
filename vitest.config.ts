import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./packages/atlassian",
      "./packages/filid",
      "./packages/imbas",
      "./packages/maencof",
      "./packages/maencof-lens",
      "./shared/cross-platform",
    ],
  },
});
