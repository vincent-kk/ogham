// Viewer entry: hydrate the injected state, mount the rendered HTML,
// apply theme/typography, enable copy + lazy enhancement, and keep the page's
// session state current with a heartbeat.

import { initComments, setConnectionState } from "./comments.js";
import { initCopy } from "./copy.js";
import { enhance } from "./enhance.js";
import { startHeartbeat } from "./heartbeat.js";
import { openLinksInNewTab } from "./links.js";

const state = window.__DEILEN_STATE__ || {};
const THEME_ORDER = ["auto", "light", "dark"];
const DEFAULT_HEARTBEAT_MS = 30000;

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyDocumentChrome() {
  const root = document.documentElement;
  if (state.content_width_px) {
    root.style.setProperty("--content-width", `${state.content_width_px}px`);
  }
  if (state.font_family) {
    root.style.setProperty("--font-doc", state.font_family);
  }
  applyTheme(state.theme || "auto");
  const title = state.title || "Document";
  document.title = `${title} · deilen`;
  const titleElement = document.getElementById("doc-title");
  if (titleElement) titleElement.textContent = title;
}

function wireChrome() {
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") || "auto";
    applyTheme(
      THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length],
    );
  });
  const sidebar = document.getElementById("sidebar");
  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });
}

function init() {
  applyDocumentChrome();
  const viewer = document.getElementById("viewer");
  if (viewer) {
    viewer.innerHTML = state.html || "";
    openLinksInNewTab(viewer);
  }
  initCopy(state);
  enhance(state.renderers || {});
  initComments(state);
  wireChrome();
  startHeartbeat({
    ping: () =>
      fetch(
        `/api/ping?session=${encodeURIComponent(state.session_id || "")}&token=${encodeURIComponent(state.token || "")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        },
      ),
    intervalMs: state.heartbeat_interval_ms || DEFAULT_HEARTBEAT_MS,
    onState: setConnectionState,
  });
}

init();
