// Settings entry: hydrate the injected Config, populate the form, and POST
// changes to /api/config.

const state = window.__DEILEN_STATE__ || {};
const config = state.config || {};

function $(id) {
  return document.getElementById(id);
}

function num(id) {
  return Number($(id).value);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme || "auto");
}

function populate() {
  const theme = config.theme || "auto";
  setTheme(theme);
  for (const radio of document.querySelectorAll('input[name="theme"]')) {
    radio.checked = radio.value === theme;
  }
  $("content_width_px").value = config.content_width_px ?? 820;
  $("font_family").value = config.font_family ?? "";
  $("auto_open").checked = config.auto_open !== false;
  $("collect_timeout_seconds").value = config.collect_timeout_seconds ?? 45;
  $("idle_shutdown_minutes").value = config.idle_shutdown_minutes ?? 10;
  $("session_ttl_hours").value = config.session_ttl_hours ?? 72;
  $("preferred_port").value = config.preferred_port ?? 0;
  const renderers = config.renderers || {};
  $("renderer_highlight").checked = renderers.highlight !== false;
  $("renderer_mermaid").checked = renderers.mermaid !== false;
  $("renderer_math").checked = renderers.math !== false;
  $("max_image_mb").value = config.max_image_mb ?? 10;
  $("max_payload_mb").value = config.max_payload_mb ?? 50;
  $("max_report_mb").value = config.max_report_mb ?? 5;
}

function collect() {
  return {
    theme:
      document.querySelector('input[name="theme"]:checked')?.value || "auto",
    auto_open: $("auto_open").checked,
    collect_timeout_seconds: num("collect_timeout_seconds"),
    session_ttl_hours: num("session_ttl_hours"),
    idle_shutdown_minutes: num("idle_shutdown_minutes"),
    preferred_port: num("preferred_port"),
    content_width_px: num("content_width_px"),
    font_family: $("font_family").value,
    renderers: {
      mermaid: $("renderer_mermaid").checked,
      highlight: $("renderer_highlight").checked,
      math: $("renderer_math").checked,
    },
    max_image_mb: num("max_image_mb"),
    max_payload_mb: num("max_payload_mb"),
    max_report_mb: num("max_report_mb"),
  };
}

async function save() {
  const status = $("status");
  const btn = $("save");
  btn.disabled = true;
  status.className = "save-status";
  status.textContent = "Saving…";
  try {
    const res = await fetch(
      `/api/config?token=${encodeURIComponent(state.token || "")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collect()),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      status.className = "save-status ok";
      status.textContent = "Saved";
    } else {
      status.className = "save-status err";
      status.textContent = body.message || "Save failed";
    }
  } catch {
    status.className = "save-status err";
    status.textContent = "Network error";
  } finally {
    btn.disabled = false;
  }
}

function init() {
  populate();
  for (const radio of document.querySelectorAll('input[name="theme"]')) {
    radio.addEventListener("change", () => setTheme(collect().theme));
  }
  $("save").addEventListener("click", save);
}

init();
