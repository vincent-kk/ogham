import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const maencofSrcEntry = fileURLToPath(
  new URL("../maencof/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@ogham/maencof": maencofSrcEntry,
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["**/fixtures/**"],
    globals: true,
  },
});
