// Atlassian Setup UI - App
'use strict';

(function () {
  // State
  var state = {
    tab: 'cloud',
    editMode: false,
    loading: false,
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
    if (banner) animateIn(banner);
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

  var MASK = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

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
      if (panel.dataset.panel === tabName) {
        animateIn(panel);
      } else {
        panel.classList.add('is-hidden');
      }
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
      if (!panel) return;
      if (type === authType) {
        animateIn(panel);
      } else {
        panel.classList.add('is-hidden');
      }
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
      } else if (!/^https?:\/\//i.test(value.trim())) {
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
