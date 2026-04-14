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
      '    placeholder="Paste JSON or .env content here...\n\nSupported formats:\n• MCP config JSON (mcpServers.mcp-atlassian.env)\n• env object JSON ({ JIRA_URL: ... })\n• .env KEY=VALUE lines"></textarea>',
      '  <div class="modal-actions">',
      '    <button class="btn btn-secondary" data-action="cancel">Cancel</button>',
      '    <button class="btn btn-primary" data-action="import">Import</button>',
      '  </div>',
      '</div>',
    ].join('\n');

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
    var lines = text.split(/\r?\n/);
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
