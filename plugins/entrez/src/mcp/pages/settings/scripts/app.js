(function () {
  "use strict";

  var MASK = "••••••••••";
  var DEFAULT_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
  var WINDOW_PRESETS = ["7", "30", "90", "365"];
  var state = window.__ENTREZ_STATE__ || null;
  // The server issues a per-session token; every request must echo it back.
  var TOKEN = new URLSearchParams(window.location.search).get("token") || "";

  var $ = function (id) {
    return document.getElementById(id);
  };
  var form = $("setup-form");
  var rateBadge = $("rate-badge");
  var statusBox = $("status");
  var testBtn = $("test-btn");
  var saveBtn = $("save-btn");
  var cancelBtn = $("cancel-btn");
  var saveCloseBtn = $("saveclose-btn");
  var apiKeyInput = $("api_key");
  var windowPreset = $("window_preset");
  var windowDays = $("window_days");

  // --- prefill from injected state ---------------------------------------
  function setValue(id, value) {
    var el = $(id);
    if (el && value !== undefined && value !== null) el.value = value;
  }

  function fillPathSuggestions(list) {
    var dl = $("output_path_options");
    if (!dl || !Array.isArray(list)) return;
    for (var i = 0; i < list.length; i++) {
      var opt = document.createElement("option");
      opt.value = list[i];
      dl.appendChild(opt);
    }
  }

  function prefillWindow(days) {
    if (typeof days !== "number" || days <= 0) {
      windowPreset.value = "";
    } else if (WINDOW_PRESETS.indexOf(String(days)) !== -1) {
      windowPreset.value = String(days);
    } else {
      windowPreset.value = "custom";
      windowDays.value = String(days);
    }
    syncWindowVisibility();
  }

  (function prefill() {
    setValue("base_url", DEFAULT_BASE);
    if (!state) {
      syncWindowVisibility();
      updateRateBadge();
      return;
    }
    fillPathSuggestions(state.path_suggestions);
    setValue("email", state.email);
    setValue("default_db", state.default_db || "pubmed");
    if (state.base_url) setValue("base_url", state.base_url);
    setValue("output_path", state.output_path);
    if (state.api_key) apiKeyInput.value = MASK;
    prefillWindow(state.default_window_days);
    var dateTag = $("date_tag");
    if (dateTag && typeof state.date_tag === "boolean")
      dateTag.checked = state.date_tag;
    updateRateBadge();
  })();

  // --- search window: reveal the custom day input on demand --------------
  function syncWindowVisibility() {
    windowDays.hidden = windowPreset.value !== "custom";
  }
  windowPreset.addEventListener("change", function () {
    syncWindowVisibility();
    if (windowPreset.value === "custom") windowDays.focus();
  });

  // --- rate badge --------------------------------------------------------
  function updateRateBadge() {
    var hasKey = apiKeyInput.value.trim().length > 0;
    rateBadge.textContent = hasKey ? "10 req/s" : "3 req/s";
    rateBadge.title = hasKey
      ? "With an API key NCBI allows 10 requests/second"
      : "Without an API key NCBI allows 3 requests/second";
  }
  apiKeyInput.addEventListener("input", updateRateBadge);

  // --- show / hide api key ----------------------------------------------
  var toggle = $("toggle-key");
  toggle.addEventListener("click", function () {
    var show = apiKeyInput.type === "password";
    apiKeyInput.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", show ? "Hide API key" : "Show API key");
  });

  // --- build request body ------------------------------------------------
  function trimmed(id) {
    var el = $(id);
    return el ? el.value.trim() : "";
  }

  /** Resolve the search window: undefined = no limit, NaN = invalid custom. */
  function windowDaysValue() {
    var preset = windowPreset.value;
    if (preset === "") return undefined;
    if (preset === "custom") return parseInt(windowDays.value, 10);
    return parseInt(preset, 10);
  }

  function collect() {
    var body = {
      email: trimmed("email"),
      default_db: $("default_db").value,
      base_url: trimmed("base_url") || DEFAULT_BASE,
      output_path: trimmed("output_path"),
      date_tag: $("date_tag").checked,
    };
    var key = apiKeyInput.value;
    if (key) body.api_key = key; // mask sent as-is = "unchanged"
    var win = windowDaysValue();
    if (typeof win === "number" && win > 0) body.default_window_days = win;
    if (!body.output_path) delete body.output_path;
    return body;
  }

  // --- validation / errors ----------------------------------------------
  function clearErrors() {
    var nodes = form.querySelectorAll(".error");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].hidden = true;
      nodes[i].textContent = "";
    }
    var inputs = form.querySelectorAll("[aria-invalid]");
    for (var j = 0; j < inputs.length; j++)
      inputs[j].removeAttribute("aria-invalid");
  }

  function showFieldError(field, message) {
    var el = form.querySelector('[data-error-for="' + field + '"]');
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
    var input = $(field);
    if (input) {
      input.setAttribute("aria-invalid", "true");
      // Reveal the error even if it lives inside the collapsed advanced section.
      var details = input.closest ? input.closest("details") : null;
      if (details && !details.open) details.open = true;
    }
  }

  function localValidate() {
    clearErrors();
    var ok = true;
    var email = trimmed("email");
    if (!email) {
      showFieldError("email", "Email address is required.");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("email", "Enter a valid email address.");
      ok = false;
    }
    if (windowPreset.value === "custom") {
      var n = parseInt(windowDays.value, 10);
      if (!isFinite(n) || n <= 0) {
        showFieldError("window_days", "Enter a positive number of days.");
        ok = false;
      }
    }
    return ok;
  }

  // --- status area -------------------------------------------------------
  function setStatus(kind, message) {
    statusBox.hidden = false;
    statusBox.setAttribute("data-kind", kind);
    statusBox.textContent = message;
  }

  function busy(btn, on, label) {
    btn.disabled = on;
    var span = btn.querySelector(".btn__label");
    if (on) {
      btn.dataset.label = span.textContent;
      span.textContent = label;
      var s = document.createElement("span");
      s.className = "spinner";
      s.setAttribute("aria-hidden", "true");
      btn.insertBefore(s, span);
    } else {
      if (btn.dataset.label) span.textContent = btn.dataset.label;
      var sp = btn.querySelector(".spinner");
      if (sp) sp.remove();
    }
  }

  function post(path, body) {
    return fetch(path + "?token=" + encodeURIComponent(TOKEN), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // --- test connection ---------------------------------------------------
  testBtn.addEventListener("click", function () {
    if (!localValidate()) {
      setStatus("error", "Fix the highlighted fields, then test.");
      return;
    }
    busy(testBtn, true, "Testing…");
    setStatus("info", "Contacting NCBI EInfo…");
    post("/test", collect())
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (res && res.success) {
          var dbs =
            typeof res.dbCount === "number"
              ? " · " + res.dbCount + " databases"
              : "";
          setStatus("ok", "Connection OK" + dbs + ".");
        } else {
          setStatus("error", (res && res.message) || "Connection failed.");
        }
      })
      .catch(function () {
        setStatus("error", "Could not reach the local server.");
      })
      .finally(function () {
        busy(testBtn, false);
      });
  });

  // --- save --------------------------------------------------------------
  function doSubmit(closeAfter) {
    if (!localValidate()) {
      setStatus("error", "Fix the highlighted fields, then save.");
      return;
    }
    var btn = closeAfter ? saveCloseBtn : saveBtn;
    busy(btn, true, "Saving…");
    setStatus("info", "Validating and saving…");
    var body = collect();
    body.closeAfter = closeAfter;
    post("/submit", body)
      .then(function (r) {
        return r.json().then(function (res) {
          return { status: r.status, res: res };
        });
      })
      .then(function (out) {
        var res = out.res || {};
        if (out.status === 200 && res.success) {
          busy(btn, false);
          if (closeAfter) {
            setStatus("ok", "Saved. This tab will close automatically.");
            saveBtn.disabled = true;
            saveCloseBtn.disabled = true;
            testBtn.disabled = true;
            setTimeout(function () {
              window.close();
            }, 1000);
          } else {
            setStatus("ok", "Saved.");
          }
        } else {
          if (Array.isArray(res.errors)) {
            res.errors.forEach(function (er) {
              showFieldError(er.field, er.message);
            });
          }
          setStatus("error", res.message || "Save failed.");
          busy(btn, false);
        }
      })
      .catch(function () {
        setStatus("error", "Could not reach the local server.");
        busy(btn, false);
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    doSubmit(false);
  });
  saveCloseBtn.addEventListener("click", function () {
    doSubmit(true);
  });
  cancelBtn.addEventListener("click", function () {
    window.close();
  });
})();
