// Loaded by index.html after helpers; DOMContentLoaded initializes the settings app.
"use strict";

(function () {
  /** Page-local helper registry populated by the preceding scripts. */
  var helpers = window.__settingsHelpers;
  // The server issues a per-session token; every request must echo it back.
  var TOKEN = new URLSearchParams(window.location.search).get("token") || "";

  // Tab identifiers — shared with json-import.js via window.__settingsApp.TABS
  var TABS = { CLOUD: "cloud", ON_PREMISE: "on-premise" };

  // State — this page's own UI bookkeeping. It never carries server data.
  var state = {
    tab: TABS.CLOUD,
    editMode: false,
    loading: false,
    cloudSiteCount: 1,
  };

  /**
   * Reads the state document the server substituted into the page.
   *
   * @returns {object|null} The parsed document, or null when the slot was
   *   never replaced — the page opened outside the settings server — or its
   *   contents are not valid JSON.
   */
  function readInjectedState() {
    var raw = window.__SETTINGS_STATE__;
    if (!raw || raw === "__SETTINGS_STATE__") return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      return null;
    }
  }

  /** One injected document supplies both initial prefill and scope controls. */
  var injected = readInjectedState();

  // --- Animation Helper ---
  function animateIn(el) {
    el.classList.remove("is-hidden");
    el.classList.add("is-entering");
    el.offsetHeight;
    el.classList.remove("is-entering");
  }

  // --- Init ---
  document.addEventListener("DOMContentLoaded", function () {
    initApp();
    bindTabs();
    bindButtons();
    bindAddSite();
  });

  function initApp() {
    capturePristineFields();
    if (!injected || !injected.configured) return;

    state.editMode = true;
    showWarningBanner();
    prefillForm(viewForScope());
  }

  function showWarningBanner() {
    var banner = document.getElementById("warning-banner");
    if (banner) animateIn(banner);
  }

  /**
   * Drop every site row a previous prefill added.
   *
   * The first row is markup the page ships with; the rest are appended per
   * configured site. Re-seating on another layer without this would stack the
   * two layers' sites in one list.
   */
  function resetSiteEntries() {
    var container = document.getElementById("cloud-sites-container");
    if (!container) return;
    while (container.children.length > 1)
      container.removeChild(container.lastElementChild);
    state.cloudSiteCount = 1;
  }

  // The values the markup ships with, captured before anything is prefilled.
  // They are the floor a layer that configures nothing falls back to — without
  // them, switching to an empty layer would leave the other layer's values on
  // screen under its name.
  var pristineFields = [];

  /** Snapshot every field's shipped value. Runs once, before the first fill. */
  function capturePristineFields() {
    pristineFields = [];
    document.querySelectorAll("[data-field]").forEach(function (el) {
      pristineFields.push({ el: el, value: el.value, checked: el.checked });
    });
  }

  /** Put every surviving field back to its shipped value. */
  function restorePristineFields() {
    for (var i = 0; i < pristineFields.length; i++) {
      var entry = pristineFields[i];
      // Fields inside site rows a previous fill added are already detached.
      if (!entry.el.isConnected) continue;
      entry.el.value = entry.value;
      entry.el.checked = entry.checked;
    }
  }

  function prefillForm(data) {
    var dt = data.deployment_type || "cloud";
    resetSiteEntries();
    restorePristineFields();
    activateTab(dt === "onprem" ? TABS.ON_PREMISE : TABS.CLOUD);

    if (dt === "cloud" && data.jira) {
      // Multi-site: jira is an array of { base_url, is_cloud }
      var sites = Array.isArray(data.jira) ? data.jira : [data.jira];
      for (var i = 0; i < sites.length; i++) {
        if (i > 0) addSiteEntry();
        setField("cloud.sites." + i + ".base_url", sites[i].base_url || "");
      }
      // Credentials are account-level (first site has them)
      var first = sites[0] || {};
      setField("cloud.username", first.username || "");
      setField("cloud.api_token", first.api_token ? MASK : "");
      if (first.ssl_verify !== undefined)
        setCheckbox("cloud.ssl_verify", first.ssl_verify);
      if (first.timeout) setField("cloud.timeout", String(first.timeout));
    } else if (dt === "onprem") {
      if (data.jira) {
        var jira = Array.isArray(data.jira) ? data.jira[0] : data.jira;
        if (jira) {
          fillOnPremFields("onprem.jira", jira);
          setRadioValue(
            "onprem.jira.api_version_override",
            jira.api_version_override || "",
          );
        }
      }
      if (data.confluence) {
        var conf = Array.isArray(data.confluence)
          ? data.confluence[0]
          : data.confluence;
        if (conf) fillOnPremFields("onprem.confluence", conf);
      }
    }
  }

  function fillOnPremFields(prefix, svc) {
    setField(prefix + ".base_url", svc.base_url || "");
    setField(prefix + ".username", svc.username || "");
    setField(prefix + ".api_token", svc.api_token ? MASK : "");
    if (svc.ssl_verify !== undefined)
      setCheckbox(prefix + ".ssl_verify", svc.ssl_verify);
    if (svc.timeout) setField(prefix + ".timeout", String(svc.timeout));
  }

  var MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

  // --- Tab Switching ---
  function bindTabs() {
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        // Clear errors and connection-test result on user-driven tab change.
        // activateTab itself stays free of side effects so prefillForm's
        // initial activation does not blow away unrelated state.
        clearErrors();
        hideStatusMessage();
        activateTab(btn.dataset.tab);
      });
    });
  }

  function activateTab(tabName) {
    state.tab = tabName;
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach(function (panel) {
      if (panel.dataset.panel === tabName) {
        animateIn(panel);
      } else {
        panel.classList.add("is-hidden");
      }
    });
  }

  /** @param {number} idx Unique field index. @returns {HTMLElement} Removable site row. */
  function createSiteEntry(idx) {
    return helpers.createSiteEntry(document, idx, helpers);
  }

  // --- Multi-site Cloud ---
  function bindAddSite() {
    var btn = document.getElementById("btn-add-site");
    if (btn) btn.addEventListener("click", addSiteEntry);
  }

  function addSiteEntry() {
    var container = document.getElementById("cloud-sites-container");
    if (!container) return;
    var idx = state.cloudSiteCount++;
    container.appendChild(createSiteEntry(idx));
  }

  // --- Buttons ---
  function bindButtons() {
    document.getElementById("btn-save").addEventListener("click", function () {
      onSubmit(false);
    });
    document
      .getElementById("btn-saveclose")
      .addEventListener("click", function () {
        onSubmit(true);
      });
    document.getElementById("btn-test").addEventListener("click", onTest);
    document
      .getElementById("btn-cancel")
      .addEventListener("click", function () {
        window.close();
      });
    document
      .getElementById("settings-form")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        onSubmit(false);
      });
  }

  // --- Validation ---
  /** @returns {boolean} Whether current fields are valid; displays field errors. */
  function validateForm() {
    return helpers.validateForm(
      document,
      collectFormData,
      getField,
      clearErrors,
      showError,
      helpers,
    );
  }

  function showError(fieldPath, msg) {
    var input = document.querySelector('[data-field="' + fieldPath + '"]');
    if (!input) return;
    input.classList.add("error");
    var group = input.closest(".form-group");
    var err = group ? group.querySelector(".field-error") : null;
    if (err) {
      err.textContent = msg;
      err.hidden = false;
      err.classList.add("is-entering");
      err.offsetHeight;
      err.classList.remove("is-entering");
    }
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach(function (el) {
      el.hidden = true;
      el.textContent = "";
    });
    document.querySelectorAll("input.error").forEach(function (el) {
      el.classList.remove("error");
    });
  }

  // --- Collect Form Data ---
  /** @returns {object} Current fields as a submission payload; does not persist. */
  function collectFormData() {
    return helpers.collectFormData(
      document,
      state,
      TABS,
      getField,
      getCheckbox,
      getNumberField,
      getRadioValue,
    );
  }

  // --- Status Message ---
  function showStatusMessage(success, msg) {
    var el = document.getElementById("test-result");
    el.textContent = msg;
    el.className = "test-result " + (success ? "success" : "error");
    el.hidden = false;
  }

  function hideStatusMessage() {
    var el = document.getElementById("test-result");
    el.hidden = true;
  }

  // --- Config scope (user / project) ---
  // Contract: cross-platform DETAIL.md "설정 페이지 계약". Credentials are never
  // layered — they stay user-only — so this toggle governs the config file
  // alone: the site URL and account a repository points at.
  var scopeState = (injected && injected.scope) || {
    paths: { user: "", project: null },
    layers: { user: null, project: null },
    overridden: [],
  };
  var configScope = injected.initialScope;

  /**
   * The prefill view the chosen layer edits.
   *
   * @returns {object} That layer's view, or the effective one when the server
   *   sent no per-layer views.
   */
  function viewForScope() {
    var byScope = injected && injected.configByScope;
    return (byScope && byScope[configScope]) || injected || {};
  }

  function renderScope() {
    var host = document.getElementById("config_scope");
    if (!host) return;
    // Rebuilding the group drops the focused radio, and the inputs are clipped
    // from view — losing focus here would leave arrow-key users with no cursor
    // and nothing on screen to say where it went.
    var hadFocus = host.contains(document.activeElement);
    host.textContent = "";
    [
      ["user", "User", "Applies wherever you work."],
      ["project", "Project", "This repository only; overrides User."],
    ].forEach(function (option) {
      var label = document.createElement("label");
      label.className = "scope-option";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "config_scope";
      radio.value = option[0];
      radio.checked = option[0] === configScope;
      radio.disabled = option[0] === "project" && !scopeState.paths.project;
      radio.addEventListener("change", function () {
        configScope = option[0];
        prefillForm(viewForScope());
        renderScope();
      });
      var text = document.createElement("span");
      text.textContent = option[1];
      label.appendChild(radio);
      label.appendChild(text);
      host.appendChild(label);
      if (option[0] === configScope) renderScopeHint(option[2]);
    });
    if (!hadFocus) return;
    var focused = host.querySelector("input:checked");
    if (focused) focused.focus();
  }

  /**
   * Writes the line under the title row: what the chosen layer means on the
   * left, the file it writes on the right. Two nodes rather than one string,
   * so the path can sit at the card's right edge without dragging the sentence
   * along with it.
   *
   * @param {string} meaning One-line description of the chosen layer.
   */
  function renderScopeHint(meaning) {
    var hint = document.getElementById("scope_hint");
    if (!hint) return;
    hint.textContent = "";
    hint.appendChild(scopeHintPart("scope-hint__meaning", meaning));
    hint.appendChild(
      scopeHintPart("scope-hint__path", scopeState.paths[configScope] || ""),
    );
  }

  /**
   * @param {string} className Class naming which half of the hint this is.
   * @param {string} text Content of that half.
   * @returns {HTMLSpanElement} Span ready to append to the hint line.
   */
  function scopeHintPart(className, text) {
    var part = document.createElement("span");
    part.className = className;
    part.textContent = text;
    return part;
  }

  renderScope();

  // --- Save (validate -> test connection -> save) ---
  /** @param {boolean} closeAfter Complete setup after saving. @returns {void} Starts saving. */
  function onSubmit(closeAfter) {
    helpers.onSubmit(closeAfter, {
      validateForm,
      collectFormData,
      setLoading,
      hideStatusMessage,
      showStatusMessage,
      fetch: fetch.bind(window),
      TOKEN,
      state,
      window,
      configScope,
      showSuccessScreen,
    });
  }

  // --- Test connection (no save) ---
  /** @returns {void} Starts a connection check and displays its result. */
  function onTest() {
    helpers.onTest({
      validateForm,
      collectFormData,
      setLoading,
      hideStatusMessage,
      showStatusMessage,
      fetch: fetch.bind(window),
      TOKEN,
    });
  }

  function showSuccessScreen() {
    document.getElementById("settings-form").classList.add("is-hidden");
    var screen = document.getElementById("success-screen");
    screen.classList.remove("is-hidden");
    var banner = document.getElementById("warning-banner");
    if (banner) banner.classList.add("is-hidden");
  }

  // --- Loading State ---
  function setLoading(on) {
    state.loading = on;
    var btns = [
      document.getElementById("btn-save"),
      document.getElementById("btn-saveclose"),
      document.getElementById("btn-test"),
      document.getElementById("btn-cancel"),
      document.getElementById("btn-import"),
    ];
    btns.forEach(function (btn) {
      if (!btn) return;
      btn.disabled = on;
      if (on) btn.classList.add("btn-spinner");
      else btn.classList.remove("btn-spinner");
    });
  }

  // --- DOM Helpers ---
  function getField(dataField) {
    var el = document.querySelector('[data-field="' + dataField + '"]');
    return el ? el.value.trim() : "";
  }

  function setField(dataField, value) {
    var el = document.querySelector('[data-field="' + dataField + '"]');
    if (el) el.value = value;
  }

  function getCheckbox(dataField) {
    var el = document.querySelector('[data-field="' + dataField + '"]');
    return el ? el.checked : true;
  }

  function setCheckbox(dataField, value) {
    var el = document.querySelector('[data-field="' + dataField + '"]');
    if (el) el.checked = Boolean(value);
  }

  function getNumberField(dataField) {
    var val = getField(dataField);
    var n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  function getRadioValue(dataField) {
    var checked = document.querySelector(
      'input[type="radio"][data-field="' + dataField + '"]:checked',
    );
    return checked ? checked.value : "";
  }

  function setRadioValue(dataField, value) {
    var radios = document.querySelectorAll(
      'input[type="radio"][data-field="' + dataField + '"]',
    );
    radios.forEach(function (r) {
      r.checked = r.value === value;
    });
  }

  // Expose fill helpers for json-import.js
  window.__settingsApp = {
    setField: setField,
    setCheckbox: setCheckbox,
    activateTab: activateTab,
    addSiteEntry: addSiteEntry,
    TABS: TABS,
  };
})();
