// GENERATED FILE — do not edit manually.
// Run: node scripts/build-setup-html.mjs

export const SETUP_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atlassian Configuration</title>
  <style>
/* Atlassian Setup UI - Styles */

:root {
  --primary: #0052CC;
  --primary-hover: #0747A6;
  --danger: #DE350B;
  --warning-bg: #FFFAE6;
  --warning-border: #FF8B00;
  --success: #00875A;
  --success-bg: #E3FCEF;
  --gray-50: #F4F5F7;
  --gray-100: #EBECF0;
  --gray-200: #DFE1E6;
  --gray-400: #97A0AF;
  --gray-600: #6B778C;
  --gray-800: #172B4D;
  --white: #FFFFFF;
  --radius: 4px;
  --shadow: 0 1px 3px rgba(9,30,66,.13), 0 0 0 1px rgba(9,30,66,.08);
  --t: .15s ease;
  --t-enter: .2s ease-out;
  --t-exit: .14s ease-in;
  --t-page: .35s ease-out;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: var(--gray-800);
  background: var(--gray-50);
  min-height: 100vh;
  padding: 24px 16px;
}

.container { max-width: 640px; margin: 0 auto; }

/* Visibility */
.is-hidden { display: none; }

/* Page Load Animation */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(12px); }
}

.card {
  background: var(--white);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 28px;
  animation: card-enter var(--t-page) both;
}

.page-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }

/* Warning Banner */
.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--warning-bg);
  border-left: 4px solid var(--warning-border);
  border-radius: var(--radius);
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #6b4c00;
  transition: opacity var(--t-enter), transform var(--t-enter);
}

.warning-banner.is-hidden { display: none; }
.warning-banner.is-entering { opacity: 0; transform: translateY(-8px); }

/* Tabs */
.tab-bar {
  display: flex;
  border-bottom: 2px solid var(--gray-200);
  margin-bottom: 24px;
}

.tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--t), border-color var(--t);
}

.tab-btn:hover { color: var(--primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }

/* Form */
.form-section { display: flex; flex-direction: column; gap: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-group label { font-weight: 500; font-size: 13px; }

.form-group input[type="text"],
.form-group input[type="url"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--gray-800);
  background: var(--white);
  outline: none;
  transition: border-color var(--t), box-shadow var(--t);
}

@keyframes focus-glow {
  from { box-shadow: 0 0 0 0 rgba(0,82,204,.3); }
  to   { box-shadow: 0 0 0 2px rgba(0,82,204,.2); }
}

.form-group input:focus {
  border-color: var(--primary);
  animation: focus-glow var(--t) ease-out forwards;
}

.form-group input:not(:focus) {
  box-shadow: none;
  transition: box-shadow var(--t-exit), border-color var(--t-exit);
}

.form-group input.error { border-color: var(--danger); }

.field-error {
  font-size: 12px;
  color: var(--danger);
  transition: opacity var(--t-enter), transform var(--t-enter);
}

.field-error.is-entering { opacity: 0; transform: translateY(-4px); }

.required { color: var(--danger); }
.optional { color: var(--gray-400); font-weight: 400; font-size: 12px; }

/* Auth Radio Pills */
.auth-type-group { display: flex; gap: 8px; flex-wrap: wrap; }

.radio-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--gray-200);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-600);
  transition: all var(--t);
  user-select: none;
}

.radio-pill:hover { border-color: var(--primary); color: var(--primary); }
.radio-pill input[type="radio"] { display: none; }
.radio-pill:has(input:checked) {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--white);
}

/* Auth Fields */
.auth-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: opacity var(--t-enter);
}

.auth-fields.is-hidden { display: none; }
.auth-fields.is-entering { opacity: 0; }

/* Tab Panels */
.tab-panel {
  transition: opacity var(--t-enter);
}

.tab-panel.is-hidden { display: none; }
.tab-panel.is-entering { opacity: 0; }

/* Advanced Accordion */
.advanced-accordion {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  overflow: hidden;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-600);
  cursor: pointer;
  list-style: none;
  background: var(--gray-50);
  transition: background var(--t);
}

.advanced-toggle::-webkit-details-marker { display: none; }
.advanced-toggle::after { content: '\\25B8'; font-size: 11px; transition: transform var(--t); }
details[open] .advanced-toggle::after { transform: rotate(90deg); }
.advanced-toggle:hover { background: var(--gray-100); }

@keyframes accordion-open {
  from { opacity: 0; transform: translateY(-6px); }
}

.advanced-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-top: 1px solid var(--gray-200);
  animation: accordion-open var(--t-enter) both;
}

/* Checkbox */
.checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 400; }
.checkbox-group input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }

/* On-premise sections */
.endpoint-section {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 20px;
}

.endpoint-section legend {
  font-weight: 600;
  font-size: 13px;
  color: var(--gray-600);
  padding: 0 8px;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.endpoint-section > * + * { margin-top: 14px; }

/* Action Row */
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  gap: 12px;
  flex-wrap: wrap;
}

.action-right { display: flex; align-items: center; gap: 10px; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--t);
  white-space: nowrap;
  transform: translateZ(0);
}

.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:active:not(:disabled) { transform: translateY(0) scale(.97); transition-duration: .08s; }
.btn-primary { background: var(--primary); color: var(--white); }
.btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
.btn-secondary { background: var(--white); color: var(--gray-800); border: 1px solid var(--gray-200); }
.btn-secondary:hover:not(:disabled) { background: var(--gray-50); border-color: var(--gray-400); }

.btn-spinner::after {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Test Result */
.test-result { font-size: 13px; padding: 4px 10px; border-radius: var(--radius); }
.test-result.success { color: var(--success); background: var(--success-bg); }
.test-result.error { color: var(--danger); background: #FFEBE6; }

/* Success Screen */
@keyframes success-icon-enter {
  from { opacity: 0; transform: scale(.5); }
}

@keyframes success-text-enter {
  from { opacity: 0; transform: translateY(6px); }
}

.success-screen { text-align: center; padding: 48px 24px; }
.success-screen.is-hidden { display: none; }

.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--success-bg);
  color: var(--success);
  border-radius: 50%;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
  animation: success-icon-enter .3s ease-out both;
}

.success-screen p {
  font-size: 15px;
  color: var(--gray-600);
  animation: success-text-enter .25s ease-out .1s both;
}

/* Modal */
@keyframes modal-backdrop-enter { from { opacity: 0; } }
@keyframes modal-card-enter { from { opacity: 0; transform: scale(.95) translateY(8px); } }
@keyframes modal-backdrop-exit { to { opacity: 0; } }
@keyframes modal-card-exit { to { opacity: 0; transform: scale(.97) translateY(4px); } }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9,30,66,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modal-backdrop-enter var(--t-enter) both;
}

.modal-overlay .modal-card {
  animation: modal-card-enter var(--t-enter) both;
}

.modal-overlay.is-closing {
  animation: modal-backdrop-exit var(--t-exit) both;
}

.modal-overlay.is-closing .modal-card {
  animation: modal-card-exit var(--t-exit) both;
}

.modal-card {
  background: var(--white);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(9,30,66,.25);
  padding: 24px;
  width: 480px;
  max-width: calc(100vw - 32px);
}

.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-title { font-size: 16px; font-weight: 600; }

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--gray-400);
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  transition: color var(--t);
}

.modal-close:hover { color: var(--gray-800); }

.modal-textarea {
  width: 100%;
  height: 180px;
  padding: 10px;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  resize: vertical;
  outline: none;
  transition: border-color var(--t);
}

.modal-textarea:focus { border-color: var(--primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }

/* Toast */
@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toast-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to   { opacity: 0; transform: translateX(-50%) translateY(8px); }
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gray-800);
  color: var(--white);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  z-index: 2000;
  white-space: nowrap;
  animation: toast-in .2s ease-out both;
}

.toast.is-hidden { display: none; }
.toast.is-exiting { animation: toast-out var(--t-exit) both; }

.tab-panel[hidden], .auth-fields[hidden] { display: none; }

@media (max-width: 500px) {
  .card { padding: 20px 16px; }
  .action-row { flex-direction: column; align-items: stretch; }
  .action-right { justify-content: flex-end; }
  .tab-btn { font-size: 12px; padding: 8px 10px; }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}

</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="page-title">Atlassian Configuration</h1>

      <div class="warning-banner is-hidden" id="warning-banner">
        <span class="warning-icon">&#9888;</span>
        Existing configuration found. Changes will overwrite current settings.
      </div>

      <div class="tab-bar">
        <button class="tab-btn active" data-tab="cloud">Cloud</button>
        <button class="tab-btn" data-tab="on-premise">On-premise (Separate Endpoints)</button>
      </div>

      <form id="setup-form" novalidate>

        <!-- Cloud Tab -->
        <div class="tab-panel" data-panel="cloud">
          <div class="form-section">

            <div id="cloud-sites-container">
              <div class="site-entry" data-site-index="0">
                <div class="form-group">
                  <label>Site Name <span class="required">*</span></label>
                  <input type="text" data-field="cloud.sites.0.base_url"
                    placeholder="your-site-name or https://your-site-name.atlassian.net" autocomplete="off">
                  <span class="field-error" hidden></span>
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-link" id="btn-add-site">+ Add another site</button>

            <div class="form-group">
              <label>Username (Email) <span class="required">*</span></label>
              <input type="text" data-field="cloud.username" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>
            <div class="form-group">
              <label>API Token <span class="required">*</span></label>
              <input type="password" data-field="cloud.api_token" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <details class="advanced-accordion">
              <summary class="advanced-toggle">Advanced</summary>
              <div class="advanced-body">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" data-field="cloud.ssl_verify" checked>
                    SSL Verify
                  </label>
                </div>
                <div class="form-group">
                  <label>Timeout (ms)</label>
                  <input type="number" data-field="cloud.timeout" placeholder="30000">
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- On-premise Tab -->
        <div class="tab-panel is-hidden" data-panel="on-premise">

          <fieldset class="endpoint-section">
            <legend>Jira</legend>

            <div class="form-group">
              <label>Base URL <span class="required">*</span></label>
              <input type="url" data-field="onprem.jira.base_url"
                placeholder="https://jira.your-company.com" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <div class="form-group">
              <label>Username <span class="required">*</span></label>
              <input type="text" data-field="onprem.jira.username" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>
            <div class="form-group">
              <label>API Token <span class="required">*</span></label>
              <input type="password" data-field="onprem.jira.api_token" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <details class="advanced-accordion">
              <summary class="advanced-toggle">Advanced</summary>
              <div class="advanced-body">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" data-field="onprem.jira.ssl_verify" checked>
                    SSL Verify
                  </label>
                </div>
                <div class="form-group">
                  <label>Timeout (ms)</label>
                  <input type="number" data-field="onprem.jira.timeout" placeholder="30000">
                </div>
              </div>
            </details>
          </fieldset>

          <fieldset class="endpoint-section">
            <legend>Confluence</legend>

            <div class="form-group">
              <label>Base URL <span class="required">*</span></label>
              <input type="url" data-field="onprem.confluence.base_url"
                placeholder="https://confluence.your-company.com" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <div class="form-group">
              <label>Username <span class="required">*</span></label>
              <input type="text" data-field="onprem.confluence.username" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>
            <div class="form-group">
              <label>API Token <span class="required">*</span></label>
              <input type="password" data-field="onprem.confluence.api_token" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <details class="advanced-accordion">
              <summary class="advanced-toggle">Advanced</summary>
              <div class="advanced-body">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" data-field="onprem.confluence.ssl_verify" checked>
                    SSL Verify
                  </label>
                </div>
                <div class="form-group">
                  <label>Timeout (ms)</label>
                  <input type="number" data-field="onprem.confluence.timeout" placeholder="30000">
                </div>
              </div>
            </details>
          </fieldset>
        </div>

        <!-- Action Buttons -->
        <div class="action-row">
          <button type="button" class="btn btn-secondary" id="btn-import">Import from JSON</button>
          <div class="action-right">
            <span class="test-result" id="test-result" hidden></span>
            <button type="submit" class="btn btn-primary" id="btn-save">Save</button>
          </div>
        </div>

      </form>

      <!-- Success Screen -->
      <div class="success-screen is-hidden" id="success-screen">
        <div class="success-icon">&#10003;</div>
        <p>Configuration saved successfully. You may close this window.</p>
      </div>

    </div>
  </div>

  <div id="toast" class="toast" hidden></div>

  <script>
    window.__SETUP_STATE__ = '__SETUP_STATE__';
  </script>
  <script>
// Atlassian Setup UI - App
'use strict';

(function () {
  // State
  var state = {
    tab: 'cloud',
    editMode: false,
    loading: false,
    cloudSiteCount: 1,
  };

  // --- Animation Helper ---
  function animateIn(el) {
    el.classList.remove('is-hidden');
    el.classList.add('is-entering');
    el.offsetHeight;
    el.classList.remove('is-entering');
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function () {
    initApp();
    bindTabs();
    bindButtons();
    bindAddSite();
    loadStatus();
  });

  function initApp() {
    var raw = window.__SETUP_STATE__;
    if (!raw || raw === '__SETUP_STATE__') return;

    var parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {
      return;
    }

    if (!parsed || !parsed.configured) return;

    state.editMode = true;
    showWarningBanner();
    prefillForm(parsed);
  }

  function showWarningBanner() {
    var banner = document.getElementById('warning-banner');
    if (banner) animateIn(banner);
  }

  function prefillForm(data) {
    var dt = data.deployment_type || 'cloud';
    activateTab(dt === 'on_premise' ? 'on-premise' : 'cloud');

    if (dt === 'cloud' && data.jira) {
      // Multi-site: jira is an array of { base_url, is_cloud }
      var sites = Array.isArray(data.jira) ? data.jira : [data.jira];
      for (var i = 0; i < sites.length; i++) {
        if (i > 0) addSiteEntry();
        setField('cloud.sites.' + i + '.base_url', sites[i].base_url || '');
      }
      // Credentials are account-level (first site has them)
      var first = sites[0] || {};
      setField('cloud.username', first.username || '');
      setField('cloud.api_token', first.api_token ? MASK : '');
      if (first.ssl_verify !== undefined) setCheckbox('cloud.ssl_verify', first.ssl_verify);
      if (first.timeout) setField('cloud.timeout', String(first.timeout));
    } else if (dt === 'on_premise') {
      if (data.jira) {
        var jira = Array.isArray(data.jira) ? data.jira[0] : data.jira;
        if (jira) fillOnPremFields('onprem.jira', jira);
      }
      if (data.confluence) {
        var conf = Array.isArray(data.confluence) ? data.confluence[0] : data.confluence;
        if (conf) fillOnPremFields('onprem.confluence', conf);
      }
    }
  }

  function fillOnPremFields(prefix, svc) {
    setField(prefix + '.base_url', svc.base_url || '');
    setField(prefix + '.username', svc.username || '');
    setField(prefix + '.api_token', svc.api_token ? MASK : '');
    if (svc.ssl_verify !== undefined) setCheckbox(prefix + '.ssl_verify', svc.ssl_verify);
    if (svc.timeout) setField(prefix + '.timeout', String(svc.timeout));
  }

  var MASK = '\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022';

  // --- Tab Switching ---
  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activateTab(btn.dataset.tab);
      });
    });
  }

  function activateTab(tabName) {
    state.tab = tabName;
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      if (panel.dataset.panel === tabName) {
        animateIn(panel);
      } else {
        panel.classList.add('is-hidden');
      }
    });
  }

  // --- Multi-site Cloud ---
  function bindAddSite() {
    var btn = document.getElementById('btn-add-site');
    if (btn) btn.addEventListener('click', addSiteEntry);
  }

  function addSiteEntry() {
    var container = document.getElementById('cloud-sites-container');
    if (!container) return;
    var idx = state.cloudSiteCount++;
    var entry = document.createElement('div');
    entry.className = 'site-entry';
    entry.dataset.siteIndex = String(idx);
    entry.innerHTML = [
      '<div class="form-group">',
      '  <label>Site Name <span class="required">*</span>',
      '    <button type="button" class="btn-remove-site" data-remove-index="' + idx + '">&times;</button>',
      '  </label>',
      '  <input type="text" data-field="cloud.sites.' + idx + '.base_url"',
      '    placeholder="your-site-name or https://your-site-name.atlassian.net" autocomplete="off">',
      '  <span class="field-error" hidden></span>',
      '</div>',
    ].join('\\n');
    container.appendChild(entry);
    entry.querySelector('.btn-remove-site').addEventListener('click', function () {
      entry.remove();
    });
  }

  // --- Buttons ---
  function bindButtons() {
    document.getElementById('btn-save').addEventListener('click', onSave);
    document.getElementById('setup-form').addEventListener('submit', function (e) {
      e.preventDefault();
      onSave();
    });
  }

  // --- Validation ---
  function validateForm() {
    clearErrors();
    var data = collectFormData();
    var valid = true;

    function requireField(fieldPath, value) {
      if (!value || !value.trim()) {
        showError(fieldPath, 'This field is required.');
        valid = false;
      }
    }

    function requireUrl(fieldPath, value) {
      if (!value || !value.trim()) {
        showError(fieldPath, 'This field is required.');
        valid = false;
      } else if (!/^https?:\\/\\//i.test(value.trim())) {
        showError(fieldPath, 'Must start with http:// or https://');
        valid = false;
      }
    }

    function requireCloudSite(fieldPath, value) {
      if (!value || !value.trim()) {
        showError(fieldPath, 'This field is required.');
        valid = false;
      } else {
        var v = value.trim();
        var isUrl = /^https?:\\/\\//i.test(v);
        var isSiteName = /^[a-zA-Z0-9][a-zA-Z0-9-]*\$/.test(v);
        if (!isUrl && !isSiteName) {
          showError(fieldPath, 'Enter a site name (e.g. my-company) or full URL (https://my-company.atlassian.net)');
          valid = false;
        }
      }
    }

    if (data.deployment_type === 'cloud') {
      // Validate each site URL
      var siteEntries = document.querySelectorAll('#cloud-sites-container .site-entry');
      siteEntries.forEach(function (entry) {
        var idx = entry.dataset.siteIndex;
        var fieldPath = 'cloud.sites.' + idx + '.base_url';
        requireCloudSite(fieldPath, getField(fieldPath));
      });
      requireField('cloud.username', data.jira ? data.jira.username : '');
      requireField('cloud.api_token', data.jira ? data.jira.api_token : '');
    } else {
      requireUrl('onprem.jira.base_url', data.jira ? data.jira.base_url : '');
      requireField('onprem.jira.username', data.jira ? data.jira.username : '');
      requireField('onprem.jira.api_token', data.jira ? data.jira.api_token : '');
      requireUrl('onprem.confluence.base_url', data.confluence ? data.confluence.base_url : '');
      requireField('onprem.confluence.username', data.confluence ? data.confluence.username : '');
      requireField('onprem.confluence.api_token', data.confluence ? data.confluence.api_token : '');
    }

    return valid;
  }

  function showError(fieldPath, msg) {
    var input = document.querySelector('[data-field="' + fieldPath + '"]');
    if (!input) return;
    input.classList.add('error');
    var err = input.nextElementSibling;
    if (err && err.classList.contains('field-error')) {
      err.textContent = msg;
      err.hidden = false;
      err.classList.add('is-entering');
      err.offsetHeight;
      err.classList.remove('is-entering');
    }
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach(function (el) {
      el.hidden = true;
      el.textContent = '';
    });
    document.querySelectorAll('input.error').forEach(function (el) {
      el.classList.remove('error');
    });
  }

  // --- Collect Form Data ---
  function collectFormData() {
    var isCloud = state.tab === 'cloud';
    var deployType = isCloud ? 'cloud' : 'on_premise';

    function normalizeCloudUrl(value) {
      if (!value) return value;
      var v = value.trim();
      if (/^https?:\\/\\//i.test(v)) return v.replace(/\\/+\$/, '');
      return 'https://' + v + '.atlassian.net';
    }

    if (isCloud) {
      // Collect all site URLs
      var siteUrls = [];
      var siteEntries = document.querySelectorAll('#cloud-sites-container .site-entry');
      siteEntries.forEach(function (entry) {
        var idx = entry.dataset.siteIndex;
        var url = getField('cloud.sites.' + idx + '.base_url');
        if (url) siteUrls.push(normalizeCloudUrl(url));
      });

      var username = getField('cloud.username');
      var apiToken = getField('cloud.api_token');
      var sslVerify = getCheckbox('cloud.ssl_verify');
      var timeout = getNumberField('cloud.timeout');

      return {
        deployment_type: deployType,
        cloud_sites: siteUrls,
        jira: {
          base_url: siteUrls[0] || '',
          username: username,
          api_token: apiToken,
          ssl_verify: sslVerify,
          timeout: timeout,
        },
        confluence: {
          base_url: siteUrls[0] || '',
          username: username,
          api_token: apiToken,
          ssl_verify: sslVerify,
          timeout: timeout,
        },
      };
    } else {
      return {
        deployment_type: deployType,
        jira: {
          base_url: getField('onprem.jira.base_url'),
          username: getField('onprem.jira.username'),
          api_token: getField('onprem.jira.api_token'),
          ssl_verify: getCheckbox('onprem.jira.ssl_verify'),
          timeout: getNumberField('onprem.jira.timeout'),
        },
        confluence: {
          base_url: getField('onprem.confluence.base_url'),
          username: getField('onprem.confluence.username'),
          api_token: getField('onprem.confluence.api_token'),
          ssl_verify: getCheckbox('onprem.confluence.ssl_verify'),
          timeout: getNumberField('onprem.confluence.timeout'),
        },
      };
    }
  }

  // --- Status Message ---
  function showStatusMessage(success, msg) {
    var el = document.getElementById('test-result');
    el.textContent = msg;
    el.className = 'test-result ' + (success ? 'success' : 'error');
    el.hidden = false;
  }

  function hideStatusMessage() {
    var el = document.getElementById('test-result');
    el.hidden = true;
  }

  // --- Save (validate -> test connection -> save) ---
  function onSave() {
    if (!validateForm()) return;

    if (state.editMode) {
      var confirmed = window.confirm('This will overwrite existing settings. Continue?');
      if (!confirmed) return;
    }

    var data = collectFormData();
    setLoading(true);
    hideStatusMessage();
    showStatusMessage(true, 'Testing connection...');

    fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.success) {
          showSuccessScreen();
        } else {
          showStatusMessage(false, result.message || 'Save failed');
        }
      })
      .catch(function (err) {
        showStatusMessage(false, 'Request failed: ' + err.message);
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function showSuccessScreen() {
    document.getElementById('setup-form').classList.add('is-hidden');
    var screen = document.getElementById('success-screen');
    screen.classList.remove('is-hidden');
    var banner = document.getElementById('warning-banner');
    if (banner) banner.classList.add('is-hidden');
  }

  // --- Status Check ---
  function loadStatus() {
    fetch('/status')
      .then(function (res) { return res.json(); })
      .catch(function () { return { configured: false }; });
  }

  // --- Loading State ---
  function setLoading(on) {
    state.loading = on;
    var btns = [
      document.getElementById('btn-save'),
      document.getElementById('btn-import'),
    ];
    btns.forEach(function (btn) {
      if (!btn) return;
      btn.disabled = on;
      if (on) btn.classList.add('btn-spinner');
      else btn.classList.remove('btn-spinner');
    });
  }

  // --- DOM Helpers ---
  function getField(dataField) {
    var el = document.querySelector('[data-field="' + dataField + '"]');
    return el ? el.value.trim() : '';
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

  // Expose fill helpers for json-import.js
  window.__setupApp = {
    setField: setField,
    setCheckbox: setCheckbox,
    activateTab: activateTab,
    addSiteEntry: addSiteEntry,
  };
})();

</script>
  <script>
// Atlassian Setup UI - JSON Import Modal
'use strict';

(function () {
  // Target keys to search for in any JSON structure
  var TARGET_KEYS = [
    'JIRA_URL', 'CONFLUENCE_URL',
    'JIRA_USERNAME', 'CONFLUENCE_USERNAME',
    'JIRA_API_TOKEN', 'CONFLUENCE_API_TOKEN',
    'JIRA_SSL_VERIFY', 'CONFLUENCE_SSL_VERIFY',
    'JIRA_TIMEOUT', 'CONFLUENCE_TIMEOUT',
  ];

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('btn-import');
    if (btn) btn.addEventListener('click', openImportModal);
  });

  // --- Modal ---
  function openImportModal() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = [
      '<div class="modal-card">',
      '  <div class="modal-header">',
      '    <span class="modal-title">Import Configuration</span>',
      '    <button class="modal-close" aria-label="Close">&times;</button>',
      '  </div>',
      '  <textarea class="modal-textarea"',
      '    placeholder="Paste JSON or .env content here...\\n\\nSupported formats:\\n• MCP config JSON (mcpServers.mcp-atlassian.env)\\n• env object JSON ({ JIRA_URL: ... })\\n• .env KEY=VALUE lines"></textarea>',
      '  <div class="modal-actions">',
      '    <button class="btn btn-secondary" data-action="cancel">Cancel</button>',
      '    <button class="btn btn-primary" data-action="import">Import</button>',
      '  </div>',
      '</div>',
    ].join('\\n');

    document.body.appendChild(overlay);

    overlay.querySelector('.modal-close').addEventListener('click', function () {
      closeModal(overlay);
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () {
      closeModal(overlay);
    });
    overlay.querySelector('[data-action="import"]').addEventListener('click', function () {
      var text = overlay.querySelector('.modal-textarea').value;
      doImport(text);
      closeModal(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  }

  function closeModal(overlay) {
    if (!overlay || !overlay.parentNode) return;
    overlay.classList.add('is-closing');
    overlay.addEventListener('animationend', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, { once: true });
  }

  // --- Parse input (JSON or .env) ---
  function parseInput(text) {
    var trimmed = text.trim();

    // Try JSON first
    if (trimmed.startsWith('{')) {
      try {
        var json = JSON.parse(trimmed);
        return extractKeysFromJson(json);
      } catch (_) {
        // Not valid JSON — fall through to .env parsing
      }
    }

    // Try partial JSON (e.g. pasted "env": { ... } block)
    var braceStart = trimmed.indexOf('{');
    if (braceStart > 0) {
      var jsonPart = trimmed.slice(braceStart);
      // Find matching closing brace
      var depth = 0;
      var end = -1;
      for (var i = 0; i < jsonPart.length; i++) {
        if (jsonPart[i] === '{') depth++;
        else if (jsonPart[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      if (end > 0) {
        try {
          var partial = JSON.parse(jsonPart.slice(0, end));
          var keys = extractKeysFromJson(partial);
          if (Object.keys(keys).length > 0) return keys;
        } catch (_) { /* fall through */ }
      }
    }

    // Fall back to .env KEY=VALUE parsing
    return parseEnvContent(trimmed);
  }

  // --- Extract target keys from any JSON depth ---
  function extractKeysFromJson(obj) {
    var result = {};

    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      var keys = Object.keys(node);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = node[key];
        if (TARGET_KEYS.indexOf(key) >= 0 && typeof val === 'string') {
          result[key] = val;
        } else if (val && typeof val === 'object') {
          walk(val);
        }
      }
    }

    walk(obj);
    return result;
  }

  // --- Parse .env ---
  function parseEnvContent(text) {
    var result = {};
    var lines = text.split(/\\r?\\n/);
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      var eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) return;
      var key = trimmed.slice(0, eqIdx).trim();
      var val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (TARGET_KEYS.indexOf(key) >= 0) {
        result[key] = val;
      }
    });
    return result;
  }

  // --- URL helpers ---
  function getOrigin(url) {
    try { return new URL(url).origin; } catch (_) { return url; }
  }

  // --- Import Logic ---
  function doImport(text) {
    var env = parseInput(text);
    if (Object.keys(env).length === 0) {
      showToast('No recognized configuration keys found.');
      return;
    }

    var app = window.__setupApp;
    if (!app) {
      showToast('App not ready. Please try again.');
      return;
    }

    var jiraUrl = env['JIRA_URL'] || '';
    var confUrl = env['CONFLUENCE_URL'] || '';

    // Separate endpoints → On-premise; same or single → Cloud
    var hasBoth = jiraUrl && confUrl;
    var sameOrigin = hasBoth && getOrigin(jiraUrl) === getOrigin(confUrl);
    var isSeparate = hasBoth && !sameOrigin;

    if (isSeparate) {
      app.activateTab('on-premise');
      fillOnPremFields(env, app);
    } else {
      app.activateTab('cloud');
      fillCloudFields(env, app);
    }

    showToast('Import complete');
  }

  function fillCloudFields(env, app) {
    var jiraUrl = env['JIRA_URL'] || env['CONFLUENCE_URL'] || '';
    app.setField('cloud.sites.0.base_url', jiraUrl);
    app.setField('cloud.username', env['JIRA_USERNAME'] || env['CONFLUENCE_USERNAME'] || '');
    app.setField('cloud.api_token', env['JIRA_API_TOKEN'] || env['CONFLUENCE_API_TOKEN'] || '');
    fillAdvanced(env, 'cloud', 'JIRA', app);
  }

  function fillOnPremFields(env, app) {
    app.setField('onprem.jira.base_url', env['JIRA_URL'] || '');
    app.setField('onprem.jira.username', env['JIRA_USERNAME'] || '');
    app.setField('onprem.jira.api_token', env['JIRA_API_TOKEN'] || '');
    fillAdvanced(env, 'onprem.jira', 'JIRA', app);

    app.setField('onprem.confluence.base_url', env['CONFLUENCE_URL'] || '');
    app.setField('onprem.confluence.username', env['CONFLUENCE_USERNAME'] || '');
    app.setField('onprem.confluence.api_token', env['CONFLUENCE_API_TOKEN'] || '');
    fillAdvanced(env, 'onprem.confluence', 'CONFLUENCE', app);
  }

  function fillAdvanced(env, prefix, service, app) {
    var sslKey = service + '_SSL_VERIFY';
    if (env[sslKey] !== undefined) {
      app.setCheckbox(prefix + '.ssl_verify', env[sslKey] !== 'false');
    }
    var timeoutKey = service + '_TIMEOUT';
    if (env[timeoutKey]) {
      var secs = parseInt(env[timeoutKey], 10);
      if (!isNaN(secs)) {
        app.setField(prefix + '.timeout', String(secs * 1000));
      }
    }
  }

  // --- Toast ---
  function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('is-hidden', 'is-exiting');
    toast.hidden = false;
    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = '';
    setTimeout(function () {
      toast.classList.add('is-exiting');
      toast.addEventListener('animationend', function () {
        toast.classList.add('is-hidden');
        toast.classList.remove('is-exiting');
      }, { once: true });
    }, 2500);
  }
})();

</script>
</body>
</html>

`;
