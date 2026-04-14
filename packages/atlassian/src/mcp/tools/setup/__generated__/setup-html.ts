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

.card {
  background: var(--white);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 28px;
}

.page-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; }

/* Warning Banner */
.warning-banner {
  display: none;
  align-items: center;
  gap: 8px;
  background: var(--warning-bg);
  border-left: 4px solid var(--warning-border);
  border-radius: var(--radius);
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #6b4c00;
}

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

.form-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0,82,204,.2);
}

.form-group input.error { border-color: var(--danger); }
.field-error { font-size: 12px; color: var(--danger); }
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
.auth-fields { display: flex; flex-direction: column; gap: 14px; }

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
.advanced-toggle::after { content: '▸'; font-size: 11px; transition: transform var(--t); }
details[open] .advanced-toggle::after { transform: rotate(90deg); }
.advanced-toggle:hover { background: var(--gray-100); }

.advanced-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-top: 1px solid var(--gray-200);
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
}

.btn:disabled { opacity: .6; cursor: not-allowed; }
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
.success-screen { text-align: center; padding: 48px 24px; }

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
}

.success-screen p { font-size: 15px; color: var(--gray-600); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9,30,66,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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
  animation: toast-in .2s ease;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.tab-panel[hidden], .auth-fields[hidden] { display: none; }

@media (max-width: 500px) {
  .card { padding: 20px 16px; }
  .action-row { flex-direction: column; align-items: stretch; }
  .action-right { justify-content: flex-end; }
  .tab-btn { font-size: 12px; padding: 8px 10px; }
}

</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="page-title">Atlassian Configuration</h1>

      <div class="warning-banner" id="warning-banner" hidden>
        <span class="warning-icon">&#9888;</span>
        Existing configuration found. Changes will overwrite current settings.
      </div>

      <div class="tab-bar">
        <button class="tab-btn active" data-tab="cloud">Cloud (Single Endpoint)</button>
        <button class="tab-btn" data-tab="on-premise">On-premise (Separate Endpoints)</button>
      </div>

      <form id="setup-form" novalidate>

        <!-- Cloud Tab -->
        <div class="tab-panel" data-panel="cloud">
          <div class="form-section">
            <div class="form-group">
              <label>Base URL <span class="required">*</span></label>
              <input type="url" data-field="cloud.jira.base_url"
                placeholder="https://your-domain.atlassian.net" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <div class="form-group">
              <label>Auth Type</label>
              <div class="auth-type-group">
                <label class="radio-pill">
                  <input type="radio" name="cloud-auth" value="basic" checked> Basic
                </label>
                <label class="radio-pill">
                  <input type="radio" name="cloud-auth" value="pat"> PAT
                </label>
                <label class="radio-pill">
                  <input type="radio" name="cloud-auth" value="oauth"> OAuth 2.0
                </label>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="cloud-basic">
              <div class="form-group">
                <label>Username <span class="required">*</span></label>
                <input type="text" data-field="cloud.jira.username" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>API Token <span class="required">*</span></label>
                <input type="password" data-field="cloud.jira.api_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="cloud-pat" hidden>
              <div class="form-group">
                <label>Personal Token <span class="required">*</span></label>
                <input type="password" data-field="cloud.jira.personal_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="cloud-oauth" hidden>
              <div class="form-group">
                <label>Client ID <span class="required">*</span></label>
                <input type="text" data-field="cloud.jira.client_id" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Client Secret <span class="required">*</span></label>
                <input type="password" data-field="cloud.jira.client_secret" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Access Token <span class="required">*</span></label>
                <input type="password" data-field="cloud.jira.access_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Refresh Token <span class="optional">(optional)</span></label>
                <input type="password" data-field="cloud.jira.refresh_token" autocomplete="off">
              </div>
            </div>

            <details class="advanced-accordion">
              <summary class="advanced-toggle">Advanced</summary>
              <div class="advanced-body">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" data-field="cloud.jira.ssl_verify" checked>
                    SSL Verify
                  </label>
                </div>
                <div class="form-group">
                  <label>Timeout (ms)</label>
                  <input type="number" data-field="cloud.jira.timeout" placeholder="30000">
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- On-premise Tab -->
        <div class="tab-panel" data-panel="on-premise" hidden>

          <fieldset class="endpoint-section">
            <legend>Jira</legend>

            <div class="form-group">
              <label>Base URL <span class="required">*</span></label>
              <input type="url" data-field="onprem.jira.base_url"
                placeholder="https://jira.your-company.com" autocomplete="off">
              <span class="field-error" hidden></span>
            </div>

            <div class="form-group">
              <label>Auth Type</label>
              <div class="auth-type-group">
                <label class="radio-pill">
                  <input type="radio" name="onprem-jira-auth" value="basic" checked> Basic
                </label>
                <label class="radio-pill">
                  <input type="radio" name="onprem-jira-auth" value="pat"> PAT
                </label>
                <label class="radio-pill">
                  <input type="radio" name="onprem-jira-auth" value="oauth"> OAuth 2.0
                </label>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="onprem-jira-basic">
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
            </div>

            <div class="auth-fields" data-auth-panel="onprem-jira-pat" hidden>
              <div class="form-group">
                <label>Personal Token <span class="required">*</span></label>
                <input type="password" data-field="onprem.jira.personal_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="onprem-jira-oauth" hidden>
              <div class="form-group">
                <label>Client ID <span class="required">*</span></label>
                <input type="text" data-field="onprem.jira.client_id" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Client Secret <span class="required">*</span></label>
                <input type="password" data-field="onprem.jira.client_secret" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Access Token <span class="required">*</span></label>
                <input type="password" data-field="onprem.jira.access_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Refresh Token <span class="optional">(optional)</span></label>
                <input type="password" data-field="onprem.jira.refresh_token" autocomplete="off">
              </div>
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
              <label>Auth Type</label>
              <div class="auth-type-group">
                <label class="radio-pill">
                  <input type="radio" name="onprem-conf-auth" value="basic" checked> Basic
                </label>
                <label class="radio-pill">
                  <input type="radio" name="onprem-conf-auth" value="pat"> PAT
                </label>
                <label class="radio-pill">
                  <input type="radio" name="onprem-conf-auth" value="oauth"> OAuth 2.0
                </label>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="onprem-conf-basic">
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
            </div>

            <div class="auth-fields" data-auth-panel="onprem-conf-pat" hidden>
              <div class="form-group">
                <label>Personal Token <span class="required">*</span></label>
                <input type="password" data-field="onprem.confluence.personal_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
            </div>

            <div class="auth-fields" data-auth-panel="onprem-conf-oauth" hidden>
              <div class="form-group">
                <label>Client ID <span class="required">*</span></label>
                <input type="text" data-field="onprem.confluence.client_id" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Client Secret <span class="required">*</span></label>
                <input type="password" data-field="onprem.confluence.client_secret" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Access Token <span class="required">*</span></label>
                <input type="password" data-field="onprem.confluence.access_token" autocomplete="off">
                <span class="field-error" hidden></span>
              </div>
              <div class="form-group">
                <label>Refresh Token <span class="optional">(optional)</span></label>
                <input type="password" data-field="onprem.confluence.refresh_token" autocomplete="off">
              </div>
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
      <div class="success-screen" id="success-screen" hidden>
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
  };

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function () {
    initApp();
    bindTabs();
    bindAuthTypeRadios();
    bindButtons();
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
    if (banner) banner.style.display = 'flex';
  }

  function prefillForm(data) {
    var dt = data.deployment_type || 'cloud';
    activateTab(dt === 'on_premise' ? 'on-premise' : 'cloud');

    if (dt === 'cloud' && data.jira) {
      fillServiceFields('cloud.jira', data.jira);
    } else if (dt === 'on_premise') {
      if (data.jira) fillServiceFields('onprem.jira', data.jira);
      if (data.confluence) fillServiceFields('onprem.confluence', data.confluence);
    }
  }

  function fillServiceFields(prefix, svc) {
    setField(prefix + '.base_url', svc.base_url || '');
    setField(prefix + '.username', svc.username || '');
    setField(prefix + '.api_token', svc.api_token ? MASK : '');
    setField(prefix + '.personal_token', svc.personal_token ? MASK : '');
    setField(prefix + '.client_id', svc.client_id || '');
    setField(prefix + '.client_secret', svc.client_secret ? MASK : '');
    setField(prefix + '.access_token', svc.access_token ? MASK : '');
    setField(prefix + '.refresh_token', svc.refresh_token ? MASK : '');
    if (svc.ssl_verify !== undefined) setCheckbox(prefix + '.ssl_verify', svc.ssl_verify);
    if (svc.timeout) setField(prefix + '.timeout', String(svc.timeout));

    var authType = svc.auth_type || detectAuthType(svc);
    var radioPrefix = prefix === 'cloud.jira' ? 'cloud' :
      prefix === 'onprem.jira' ? 'onprem-jira' : 'onprem-conf';
    setRadio(radioPrefix + '-auth', authType);
    showAuthPanel(radioPrefix, authType);
  }

  var MASK = '\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022';

  function detectAuthType(svc) {
    if (svc.client_id) return 'oauth';
    if (svc.personal_token) return 'pat';
    return 'basic';
  }

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
      panel.hidden = panel.dataset.panel !== tabName;
    });
  }

  // --- Auth Type Radios ---
  function bindAuthTypeRadios() {
    var groups = [
      { name: 'cloud-auth', prefix: 'cloud' },
      { name: 'onprem-jira-auth', prefix: 'onprem-jira' },
      { name: 'onprem-conf-auth', prefix: 'onprem-conf' },
    ];
    groups.forEach(function (g) {
      document.querySelectorAll('input[name="' + g.name + '"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
          showAuthPanel(g.prefix, radio.value);
        });
      });
    });
  }

  function showAuthPanel(prefix, authType) {
    ['basic', 'pat', 'oauth'].forEach(function (type) {
      var panel = document.querySelector('[data-auth-panel="' + prefix + '-' + type + '"]');
      if (panel) panel.hidden = type !== authType;
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

    function requireUrl(fieldPath, value) {
      if (!value || !value.trim()) {
        showError(fieldPath, 'This field is required.');
        valid = false;
      } else if (!/^https?:\\/\\//i.test(value.trim())) {
        showError(fieldPath, 'Must start with http:// or https://');
        valid = false;
      }
    }

    function requireField(fieldPath, value) {
      if (!value || !value.trim()) {
        showError(fieldPath, 'This field is required.');
        valid = false;
      }
    }

    function validateService(prefix, svc) {
      requireUrl(prefix + '.base_url', svc.base_url);
      if (svc.auth_type === 'basic') {
        requireField(prefix + '.username', svc.username);
        requireField(prefix + '.api_token', svc.api_token);
      } else if (svc.auth_type === 'pat') {
        requireField(prefix + '.personal_token', svc.personal_token);
      } else if (svc.auth_type === 'oauth') {
        requireField(prefix + '.client_id', svc.client_id);
        requireField(prefix + '.client_secret', svc.client_secret);
        requireField(prefix + '.access_token', svc.access_token);
      }
    }

    if (data.deployment_type === 'cloud') {
      validateService('cloud.jira', data.jira);
    } else {
      validateService('onprem.jira', data.jira);
      validateService('onprem.confluence', data.confluence);
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

    function getServiceData(prefix) {
      var radioName = prefix === 'cloud.jira' ? 'cloud-auth' :
        prefix === 'onprem.jira' ? 'onprem-jira-auth' : 'onprem-conf-auth';
      var authType = getRadioValue(radioName) || 'basic';
      return {
        base_url: getField(prefix + '.base_url'),
        auth_type: authType,
        username: getField(prefix + '.username'),
        api_token: getField(prefix + '.api_token'),
        personal_token: getField(prefix + '.personal_token'),
        client_id: getField(prefix + '.client_id'),
        client_secret: getField(prefix + '.client_secret'),
        access_token: getField(prefix + '.access_token'),
        refresh_token: getField(prefix + '.refresh_token'),
        ssl_verify: getCheckbox(prefix + '.ssl_verify'),
        timeout: getNumberField(prefix + '.timeout'),
      };
    }

    if (isCloud) {
      var jira = getServiceData('cloud.jira');
      return { deployment_type: deployType, jira: jira, confluence: jira };
    } else {
      return {
        deployment_type: deployType,
        jira: getServiceData('onprem.jira'),
        confluence: getServiceData('onprem.confluence'),
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

  // --- Save (validate → test connection → save) ---
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
    document.getElementById('setup-form').hidden = true;
    document.getElementById('success-screen').hidden = false;
    var banner = document.getElementById('warning-banner');
    if (banner) banner.hidden = true;
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

  function getRadioValue(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function setRadio(name, value) {
    var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }

  // Expose fill helpers for json-import.js
  window.__setupApp = {
    setField: setField,
    setCheckbox: setCheckbox,
    setRadio: setRadio,
    showAuthPanel: showAuthPanel,
    activateTab: activateTab,
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
    'JIRA_PERSONAL_TOKEN', 'CONFLUENCE_PERSONAL_TOKEN',
    'ATLASSIAN_OAUTH_CLIENT_ID', 'ATLASSIAN_OAUTH_CLIENT_SECRET',
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
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
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
    app.setField('cloud.jira.base_url', jiraUrl);

    var authType = detectAuthType(env, 'JIRA');
    app.setRadio('cloud-auth', authType);
    app.showAuthPanel('cloud', authType);

    if (authType === 'basic') {
      app.setField('cloud.jira.username', env['JIRA_USERNAME'] || env['CONFLUENCE_USERNAME'] || '');
      app.setField('cloud.jira.api_token', env['JIRA_API_TOKEN'] || env['CONFLUENCE_API_TOKEN'] || '');
    } else if (authType === 'pat') {
      app.setField('cloud.jira.personal_token', env['JIRA_PERSONAL_TOKEN'] || env['CONFLUENCE_PERSONAL_TOKEN'] || '');
    } else if (authType === 'oauth') {
      app.setField('cloud.jira.client_id', env['ATLASSIAN_OAUTH_CLIENT_ID'] || '');
      app.setField('cloud.jira.client_secret', env['ATLASSIAN_OAUTH_CLIENT_SECRET'] || '');
    }

    fillAdvanced(env, 'cloud.jira', 'JIRA', app);
  }

  function fillOnPremFields(env, app) {
    app.setField('onprem.jira.base_url', env['JIRA_URL'] || '');
    var jiraAuth = detectAuthType(env, 'JIRA');
    app.setRadio('onprem-jira-auth', jiraAuth);
    app.showAuthPanel('onprem-jira', jiraAuth);

    if (jiraAuth === 'basic') {
      app.setField('onprem.jira.username', env['JIRA_USERNAME'] || '');
      app.setField('onprem.jira.api_token', env['JIRA_API_TOKEN'] || '');
    } else if (jiraAuth === 'pat') {
      app.setField('onprem.jira.personal_token', env['JIRA_PERSONAL_TOKEN'] || '');
    } else if (jiraAuth === 'oauth') {
      app.setField('onprem.jira.client_id', env['ATLASSIAN_OAUTH_CLIENT_ID'] || '');
      app.setField('onprem.jira.client_secret', env['ATLASSIAN_OAUTH_CLIENT_SECRET'] || '');
    }
    fillAdvanced(env, 'onprem.jira', 'JIRA', app);

    app.setField('onprem.confluence.base_url', env['CONFLUENCE_URL'] || '');
    var confAuth = detectAuthType(env, 'CONFLUENCE');
    app.setRadio('onprem-conf-auth', confAuth);
    app.showAuthPanel('onprem-conf', confAuth);

    if (confAuth === 'basic') {
      app.setField('onprem.confluence.username', env['CONFLUENCE_USERNAME'] || '');
      app.setField('onprem.confluence.api_token', env['CONFLUENCE_API_TOKEN'] || '');
    } else if (confAuth === 'pat') {
      app.setField('onprem.confluence.personal_token', env['CONFLUENCE_PERSONAL_TOKEN'] || '');
    } else if (confAuth === 'oauth') {
      app.setField('onprem.confluence.client_id', env['ATLASSIAN_OAUTH_CLIENT_ID'] || '');
      app.setField('onprem.confluence.client_secret', env['ATLASSIAN_OAUTH_CLIENT_SECRET'] || '');
    }
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

  function detectAuthType(env, service) {
    if (env['ATLASSIAN_OAUTH_CLIENT_ID']) return 'oauth';
    if (env[service + '_PERSONAL_TOKEN']) return 'pat';
    return 'basic';
  }

  // --- Toast ---
  function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    setTimeout(function () { toast.hidden = true; }, 2500);
  }
})();

</script>
</body>
</html>

`;
