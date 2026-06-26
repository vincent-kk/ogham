(function () {
  "use strict";

  var MASK = "••••••••••";
  var DEFAULT_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
  var state = window.__ENTREZ_STATE__ || null;

  var $ = function (id) {
    return document.getElementById(id);
  };
  var form = $("setup-form");
  var rateBadge = $("rate-badge");
  var statusBox = $("status");
  var testBtn = $("test-btn");
  var saveBtn = $("save-btn");
  var apiKeyInput = $("api_key");

  // --- prefill from injected state ---------------------------------------
  function setValue(id, value) {
    var el = $(id);
    if (el && value !== undefined && value !== null) el.value = value;
  }

  (function prefill() {
    setValue("base_url", DEFAULT_BASE);
    if (!state) {
      updateRateBadge();
      return;
    }
    setValue("tool", state.tool);
    setValue("email", state.email);
    setValue("default_db", state.default_db || "pubmed");
    if (state.base_url) setValue("base_url", state.base_url);
    setValue("output_path", state.output_path);
    if (state.api_key) apiKeyInput.value = MASK;
    if (state.default_date_range) {
      setValue("date_from", state.default_date_range.from);
      setValue("date_to", state.default_date_range.to);
    }
    var dateTag = $("date_tag");
    if (dateTag && typeof state.date_tag === "boolean")
      dateTag.checked = state.date_tag;
    updateRateBadge();
  })();

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

  function collect() {
    var body = {
      tool: trimmed("tool"),
      email: trimmed("email"),
      default_db: $("default_db").value,
      base_url: trimmed("base_url") || DEFAULT_BASE,
      output_path: trimmed("output_path"),
      date_tag: $("date_tag").checked,
    };
    var key = apiKeyInput.value;
    if (key) body.api_key = key; // mask sent as-is = "unchanged"
    var from = trimmed("date_from");
    var to = trimmed("date_to");
    if (from || to) body.default_date_range = { from: from, to: to };
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
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function localValidate() {
    clearErrors();
    var ok = true;
    if (!trimmed("tool")) {
      showFieldError("tool", "Tool name is required.");
      ok = false;
    }
    var email = trimmed("email");
    if (!email) {
      showFieldError("email", "Contact email is required.");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("email", "Enter a valid email address.");
      ok = false;
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
    return fetch(path, {
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
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!localValidate()) {
      setStatus("error", "Fix the highlighted fields, then save.");
      return;
    }
    busy(saveBtn, true, "Saving…");
    setStatus("info", "Validating and saving…");
    post("/submit", collect())
      .then(function (r) {
        return r.json().then(function (res) {
          return { status: r.status, res: res };
        });
      })
      .then(function (out) {
        var res = out.res || {};
        if (out.status === 200 && res.success) {
          setStatus(
            "ok",
            "Saved. You can close this window — the server will shut down.",
          );
          saveBtn.disabled = true;
          testBtn.disabled = true;
        } else {
          if (Array.isArray(res.errors)) {
            res.errors.forEach(function (er) {
              showFieldError(er.field, er.message);
            });
          }
          setStatus("error", res.message || "Save failed.");
          busy(saveBtn, false);
        }
      })
      .catch(function () {
        setStatus("error", "Could not reach the local server.");
        busy(saveBtn, false);
      });
  });
})();
