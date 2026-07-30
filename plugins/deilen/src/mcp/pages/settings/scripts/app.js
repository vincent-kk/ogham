// Settings entry: hydrate the injected ConfigScopeState, populate the form for
// the selected scope, and POST one layer back to /api/config.
//
// THIS PAGE IS THE CANONICAL SCOPE-UI IMPLEMENTATION. There is no shared UI
// package; the contract it follows lives in cross-platform's DETAIL.md under
// "설정 페이지 계약" (config_scope / data-config-path / data-scope-state), and
// the other plugins' settings pages mirror this structure.

import { clearConfigPaths, listOverriddenPaths } from "@ogham/cross-platform";

const injected = window.__DEILEN_STATE__ || {};
const token = injected.token || "";
const SAVED_CLOSE_HINT_MS = 250;

/** Latest ConfigScopeState from the server; replaced by every save response. */
let state = injected.state || {
  paths: { user: "", project: null },
  layers: { user: null, project: null },
  effective: {},
  overridden: [],
  warnings: [],
};
let scope = state.paths.project === null ? "user" : "project";
/** Paths the project layer currently overrides. Editing a field adds to it. */
let overridden = new Set(state.overridden);

function $(id) {
  return document.getElementById(id);
}

function readNumber(id) {
  return Number($(id).value);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme || "auto");
}

function populate(config) {
  const theme = config.theme || "auto";
  setTheme(theme);
  for (const radio of document.querySelectorAll('input[name="theme"]')) {
    radio.checked = radio.value === theme;
  }
  $("content_width_px").value = config.content_width_px ?? 820;
  $("font_family").value = config.font_family ?? "";
  $("auto_open").checked = config.auto_open !== false;
  $("collect_timeout_seconds").value = config.collect_timeout_seconds ?? 600;
  $("idle_shutdown_minutes").value = config.idle_shutdown_minutes ?? 1;
  $("session_ttl_hours").value = config.session_ttl_hours ?? 72;
  $("preferred_port").value = config.preferred_port ?? 0;
  const renderers = config.renderers || {};
  $("renderer_highlight").checked = renderers.highlight !== false;
  $("renderer_mermaid").checked = renderers.mermaid !== false;
  $("renderer_math").checked = renderers.math !== false;
  $("max_image_mb").value = config.max_image_mb ?? 10;
  $("max_payload_mb").value = config.max_payload_mb ?? 50;
  $("max_viewer_mb").value = config.max_viewer_mb ?? 5;
}

function collect() {
  return {
    theme:
      document.querySelector('input[name="theme"]:checked')?.value || "auto",
    auto_open: $("auto_open").checked,
    collect_timeout_seconds: readNumber("collect_timeout_seconds"),
    session_ttl_hours: readNumber("session_ttl_hours"),
    idle_shutdown_minutes: readNumber("idle_shutdown_minutes"),
    preferred_port: readNumber("preferred_port"),
    content_width_px: readNumber("content_width_px"),
    font_family: $("font_family").value,
    renderers: {
      mermaid: $("renderer_mermaid").checked,
      highlight: $("renderer_highlight").checked,
      math: $("renderer_math").checked,
    },
    max_image_mb: readNumber("max_image_mb"),
    max_payload_mb: readNumber("max_payload_mb"),
    max_viewer_mb: readNumber("max_viewer_mb"),
  };
}

/**
 * The document to send for the current scope.
 *
 * User is a complete document. Project keeps only the overridden paths —
 * dropping a path IS the clear-override action, which is why there is no
 * separate route for it.
 */
function documentForScope() {
  const full = collect();
  if (scope === "user") return full;
  const notOverridden = listOverriddenPaths(full).filter(
    (path) => !overridden.has(path),
  );
  return clearConfigPaths(full, notOverridden);
}

function fieldElements() {
  return document.querySelectorAll("[data-config-path]");
}

function applyScopeBadges() {
  for (const element of fieldElements()) {
    const path = element.getAttribute("data-config-path");
    element.setAttribute(
      "data-scope-state",
      scope === "user"
        ? "own"
        : overridden.has(path)
          ? "overridden"
          : "inherited",
    );
  }
}

/** Inject the badge and the clear button once; CSS decides when they show. */
function decorateFields() {
  for (const element of fieldElements()) {
    const path = element.getAttribute("data-config-path");
    const badge = document.createElement("span");
    badge.className = "scope-badge";
    element.appendChild(badge);

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "scope-clear";
    clear.textContent = "Clear override";
    clear.addEventListener("click", (event) => {
      event.preventDefault();
      overridden.delete(path);
      void save(false);
    });
    element.appendChild(clear);
  }
}

/** Editing a field under the project scope makes it an override. */
function markOverridden(element) {
  const owner = element.closest("[data-config-path]");
  if (owner === null || scope !== "project") return;
  overridden.add(owner.getAttribute("data-config-path"));
  applyScopeBadges();
}

/** One hint fragment; CSS pushes __meaning left and __path right. */
function scopeHintPart(className, text) {
  const part = document.createElement("span");
  part.className = className;
  part.textContent = text;
  return part;
}

/** Say what the selected layer means, then name the file it writes to. */
function renderScopeHint(projectAvailable) {
  const hint = $("scope_hint");
  hint.textContent = "";
  if (!projectAvailable) {
    hint.appendChild(
      scopeHintPart(
        "scope-hint__meaning",
        "No project root is available, so only user settings can be edited.",
      ),
    );
    return;
  }
  hint.appendChild(
    scopeHintPart(
      "scope-hint__meaning",
      scope === "project"
        ? "Project settings override user settings"
        : "User settings apply to every project",
    ),
  );
  hint.appendChild(scopeHintPart("scope-hint__path", state.paths[scope]));
}

function renderScope() {
  const projectAvailable = state.paths.project !== null;
  for (const radio of document.querySelectorAll('input[name="config_scope"]')) {
    radio.checked = radio.value === scope;
    if (radio.value === "project") radio.disabled = !projectAvailable;
  }
  renderScopeHint(projectAvailable);

  populate(
    scope === "user" ? (state.layers.user ?? {}) : (state.effective ?? {}),
  );
  applyScopeBadges();
}

function adoptState(next) {
  state = next;
  overridden = new Set(next.overridden);
  if (state.paths.project === null) scope = "user";
  renderScope();
}

async function save(close) {
  const status = $("status");
  const saveButton = $("save");
  const closeButton = $("save-close");
  saveButton.disabled = true;
  closeButton.disabled = true;
  status.className = "status";
  status.textContent = "Saving…";
  try {
    const response = await fetch(
      `/api/config?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, config: documentForScope() }),
      },
    );
    const responseBody = await response.json().catch(() => ({}));
    if (response.ok) {
      if (responseBody.state) adoptState(responseBody.state);
      status.className = "status ok";
      if (close) {
        status.textContent = "Saved — closing…";
        // Best-effort: browsers only honor close() for script-opened tabs, so
        // a settings tab opened by the OS stays put — the fallback says so.
        window.close();
        setTimeout(() => {
          status.textContent = "Saved. You can close this tab.";
        }, SAVED_CLOSE_HINT_MS);
      } else {
        status.textContent = "Saved";
      }
    } else {
      status.className = "status err";
      const issues = Array.isArray(responseBody.errors)
        ? responseBody.errors
        : [];
      status.textContent = issues.length
        ? `Save failed — ${issues.join("; ")}`
        : responseBody.message || "Save failed";
    }
  } catch {
    status.className = "status err";
    status.textContent = "Network error";
  } finally {
    saveButton.disabled = false;
    closeButton.disabled = false;
  }
}

function init() {
  decorateFields();
  renderScope();

  for (const radio of document.querySelectorAll('input[name="theme"]')) {
    radio.addEventListener("change", () => setTheme(collect().theme));
  }
  for (const radio of document.querySelectorAll('input[name="config_scope"]')) {
    radio.addEventListener("change", () => {
      scope = radio.value;
      renderScope();
    });
  }
  for (const element of document.querySelectorAll("#form input")) {
    element.addEventListener("change", () => markOverridden(element));
    element.addEventListener("input", () => markOverridden(element));
  }

  $("cancel").addEventListener("click", () => window.close());
  $("save").addEventListener("click", () => save(false));
  $("save-close").addEventListener("click", () => save(true));
}

init();
