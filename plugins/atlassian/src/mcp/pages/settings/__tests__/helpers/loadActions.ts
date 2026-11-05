import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { vi } from "vitest";

/**
 * Load private request actions with deterministic UI and transport edges.
 * @param result Response body returned by the simulated server.
 * @param failure Optional simulated transport rejection.
 * @returns Request actions and observation spies; throws if page loading fails.
 */
export function loadActions(
  result: { success: boolean; message?: string },
  failure?: Error,
) {
  const status = vi.fn();
  const loading = vi.fn();
  const successScreen = vi.fn();
  const confirm = vi.fn(() => true);
  const fetch = failure
    ? vi.fn().mockRejectedValue(failure)
    : vi.fn().mockResolvedValue({ json: async () => result });
  const context = {
    window: {
      location: { search: "?token=a%26b" },
      __SETTINGS_STATE__: { initialScope: "project" },
      confirm,
    },
    document: { addEventListener() {}, getElementById: () => null },
    URLSearchParams,
    fetch,
    status,
    loading,
    successScreen,
  };
  const root = join(import.meta.dirname, "../..");
  const html = readFileSync(join(root, "index.html"), "utf8");
  let api: { onSubmit(closeAfter: boolean): void; onTest(): void } | undefined;
  for (const match of html.matchAll(/<script src="\.\/(scripts\/[^\"]+)"/g)) {
    if (match[1] === "scripts/json-import.js") continue;
    let source = readFileSync(join(root, match[1]), "utf8");
    if (match[1] === "scripts/app.js") {
      source = source.replace(
        /\}\)\(\);\s*$/,
        `
        validateForm = () => true;
        collectFormData = () => ({ deployment_type: "cloud" });
        setLoading = loading; hideStatusMessage = () => {};
        showStatusMessage = status; showSuccessScreen = successScreen;
        state.editMode = true;
        return { onSubmit, onTest };
      })();`,
      );
      api = runInNewContext(source, context);
    } else runInNewContext(source, context);
  }
  if (!api) throw new Error("settings app was not loaded");
  return { api, fetch, status, loading, successScreen, confirm };
}
