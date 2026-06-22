// Report viewer entry: hydrate the injected state, mount the rendered HTML,
// apply theme/typography, enable copy + lazy enhancement, and keep the server
// alive with a heartbeat.

import { initComments } from "./comments.js";
import { initCopy } from "./copy.js";
import { enhance } from "./enhance.js";

const state = window.__DEILEN_STATE__ || {};
const THEME_ORDER = ["auto", "light", "dark"];

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyDocumentChrome() {
  const root = document.documentElement;
  if (state.content_width_px) {
    root.style.setProperty("--content-width", `${state.content_width_px}px`);
  }
  if (state.font_family) {
    root.style.setProperty("--font-body", state.font_family);
  }
  applyTheme(state.theme || "auto");
  const title = state.title || "Report";
  document.title = `${title} · deilen`;
  const titleEl = document.getElementById("doc-title");
  if (titleEl) titleEl.textContent = title;
}

function wireChrome() {
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "auto";
    applyTheme(
      THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length],
    );
  });
  const sidebar = document.getElementById("sidebar");
  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });
}

function startHeartbeat() {
  const interval = state.heartbeat_interval_ms || 30000;
  const ping = () => {
    fetch(`/api/ping?token=${encodeURIComponent(state.token || "")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: state.session_id }),
      keepalive: true,
    }).catch(() => {});
  };
  ping();
  window.setInterval(ping, interval);
}

function init() {
  applyDocumentChrome();
  const report = document.getElementById("report");
  if (report) report.innerHTML = state.html || "";
  initCopy(state);
  enhance(state.renderers || {});
  initComments(state);
  wireChrome();
  startHeartbeat();
}

init();
