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

  var MASK = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

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
    ].join('\n');
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
      } else if (!/^https?:\/\//i.test(value.trim())) {
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
        var isUrl = /^https?:\/\//i.test(v);
        var isSiteName = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(v);
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
      if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/, '');
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
