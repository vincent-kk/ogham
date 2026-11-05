import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

/** Canonical browser scripts loaded by the settings page. */
const settingsDir = join(import.meta.dirname, "../..");

/**
 * Load private form operations with deterministic fields.
 * @param values Field paths and text values to expose.
 * @param tab Active tab identifier.
 * @returns Form operations and displayed errors; throws if page loading fails.
 */
export function loadForm(values: Record<string, string>, tab = "cloud") {
  const errors: string[] = [];
  const fields = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      {
        value,
        checked: value !== "false",
        classList: { add() {} },
        closest: () => ({
          querySelector: () => ({
            set textContent(message: string) {
              errors.push(message);
            },
            classList: { add() {}, remove() {} },
          }),
        }),
      },
    ]),
  );
  const document = {
    addEventListener() {},
    getElementById: () => null,
    querySelector(selector: string) {
      const key = selector.match(/data-field="([^"]+)"/)?.[1];
      return key ? fields[key] : null;
    },
    querySelectorAll(selector: string) {
      if (selector === "#cloud-sites-container .site-entry") {
        return Object.keys(values)
          .filter((key) => /^cloud\.sites\.\d+\.base_url$/.test(key))
          .map((key) => ({ dataset: { siteIndex: key.split(".")[2] } }));
      }
      return [];
    },
  };
  const window = {
    location: { search: "?token=test" },
    __SETTINGS_STATE__: { initialScope: "user" },
  };
  const context = { window, document, URLSearchParams };
  const html = readFileSync(join(settingsDir, "index.html"), "utf8");
  let api:
    | { collectFormData(): Record<string, unknown>; validateForm(): boolean }
    | undefined;
  for (const match of html.matchAll(/<script src="\.\/(scripts\/[^"]+)"/g)) {
    if (match[1] === "scripts/json-import.js") continue;
    let source = readFileSync(join(settingsDir, match[1]), "utf8");
    if (match[1] === "scripts/app.js") {
      source = source.replace(
        /\}\)\(\);\s*$/,
        `state.tab = ${JSON.stringify(tab)}; return { collectFormData, validateForm }; })();`,
      );
      api = runInNewContext(source, context);
    } else {
      runInNewContext(source, context);
    }
  }
  if (!api) throw new Error("settings app was not loaded");
  return { api, errors };
}
