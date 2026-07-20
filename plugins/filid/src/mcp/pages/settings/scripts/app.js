(function () {
  'use strict';

  var state =
    typeof window.__FILID_STATE__ === 'object' ? window.__FILID_STATE__ : null;
  // The server issues a per-session token; every request must echo it back.
  var TOKEN = new URLSearchParams(window.location.search).get('token') || '';
  var SEVERITIES = ['error', 'warning', 'info'];

  var $ = function (id) {
    return document.getElementById(id);
  };
  var form = $('settings-form');
  var statusBox = $('status');
  var saveBtn = $('save-btn');
  var closeBtn = $('close-btn');
  var saveCloseBtn = $('saveclose-btn');
  var dirty = false;
  var saved = false;

  if (!state) {
    setStatus(
      'error',
      'Settings state failed to load. Reopen this page from Claude Code (/filid:setup).',
    );
    saveBtn.disabled = true;
    return;
  }

  // --- render: project chip & init note ----------------------------------
  $('project-chip').textContent = state.projectRoot;
  $('project-chip').title = state.projectRoot;
  if (!state.configExists) $('init-note').hidden = false;

  // --- render: rule documents ---------------------------------------------
  function badge(text, kind) {
    var el = document.createElement('span');
    el.className = 'badge' + (kind ? ' badge--' + kind : '');
    el.textContent = text;
    return el;
  }

  function docRow(entry, required) {
    var li = document.createElement('li');
    li.className = 'docrow';

    var checkCell = document.createElement('span');
    checkCell.className = 'docrow__check';
    var main = document.createElement('div');
    main.className = 'docrow__main';
    var title = document.createElement('div');
    title.className = 'docrow__title';
    var desc = document.createElement('p');
    desc.className = 'docrow__desc';
    desc.textContent = entry.description;

    if (required) {
      title.appendChild(document.createTextNode(entry.title));
      title.appendChild(badge('REQUIRED'));
      if (entry.deployed && !entry.inSync)
        title.appendChild(badge('AUTO-UPDATES ON SAVE', 'update'));
    } else {
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.id = 'doc-' + entry.id;
      box.checked = entry.deployed;
      box.setAttribute('data-doc-id', entry.id);
      checkCell.appendChild(box);

      var label = document.createElement('label');
      label.setAttribute('for', box.id);
      label.textContent = entry.title;
      title.appendChild(label);
      if (entry.deployed && !entry.inSync) {
        title.appendChild(badge('UPDATE AVAILABLE', 'update'));
        var resync = document.createElement('label');
        resync.className = 'resync';
        var rbox = document.createElement('input');
        rbox.type = 'checkbox';
        rbox.setAttribute('data-resync-id', entry.id);
        resync.appendChild(rbox);
        resync.appendChild(
          document.createTextNode(
            'Overwrite local edits with the newer plugin template',
          ),
        );
        main.appendChild(title);
        main.appendChild(desc);
        main.appendChild(resync);
        li.appendChild(checkCell);
        li.appendChild(main);
        return li;
      }
    }

    main.appendChild(title);
    main.appendChild(desc);
    li.appendChild(checkCell);
    li.appendChild(main);
    return li;
  }

  (function renderRuleDocs() {
    var docs = state.ruleDocs;
    if (!docs.pluginRootResolved) {
      $('rule-docs-unavailable').hidden = false;
      return;
    }
    var requiredList = $('rule-docs-required');
    var optionalList = $('rule-docs-optional');
    docs.autoDeployed.forEach(function (entry) {
      requiredList.appendChild(docRow(entry, true));
    });
    docs.entries.forEach(function (entry) {
      optionalList.appendChild(docRow(entry, false));
    });
  })();

  // --- render: structural rules -------------------------------------------
  function ruleItem(id, override) {
    var li = document.createElement('li');
    li.className = 'ruleitem';

    var row = document.createElement('div');
    row.className = 'rulerow';

    var name = document.createElement('span');
    name.className = 'rulerow__name';
    var nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'rule-' + id + '-enabled');
    nameLabel.textContent = id;
    name.appendChild(nameLabel);

    var enabledCell = document.createElement('span');
    enabledCell.className = 'rulerow__enabled';
    var enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.id = 'rule-' + id + '-enabled';
    enabled.checked = override.enabled !== false;
    enabled.setAttribute('data-rule-enabled', id);
    enabled.setAttribute('aria-label', id + ' enabled');
    enabledCell.appendChild(enabled);

    var severity = document.createElement('select');
    severity.setAttribute('data-rule-severity', id);
    severity.setAttribute('aria-label', id + ' severity');
    SEVERITIES.forEach(function (level) {
      var opt = document.createElement('option');
      opt.value = level;
      opt.textContent = level;
      severity.appendChild(opt);
    });
    if (override.severity) severity.value = override.severity;

    row.appendChild(name);
    row.appendChild(enabledCell);
    row.appendChild(severity);
    li.appendChild(row);

    var exempt = document.createElement('details');
    exempt.className = 'ruleexempt';
    var summary = document.createElement('summary');
    summary.textContent = 'Exempt patterns';
    var area = document.createElement('textarea');
    area.rows = 2;
    area.spellcheck = false;
    area.placeholder = 'src/legacy/**';
    area.setAttribute('data-rule-exempt', id);
    area.setAttribute('aria-label', id + ' exempt patterns');
    if (override.exempt && override.exempt.length) {
      area.value = override.exempt.join('\n');
      exempt.open = true;
    }
    exempt.appendChild(summary);
    exempt.appendChild(area);
    li.appendChild(exempt);

    function reflectEnabled() {
      li.className = enabled.checked
        ? 'ruleitem'
        : 'ruleitem ruleitem--disabled';
    }
    enabled.addEventListener('change', reflectEnabled);
    reflectEnabled();
    return li;
  }

  (function renderRules() {
    var list = $('rules-list');
    Object.keys(state.config.rules).forEach(function (id) {
      list.appendChild(ruleItem(id, state.config.rules[id] || {}));
    });
  })();

  // --- prefill: general & structure exceptions ----------------------------
  (function prefill() {
    if (state.config.language) $('language').value = state.config.language;
    if (state.config.scan && typeof state.config.scan.maxDepth === 'number')
      $('max-depth').value = String(state.config.scan.maxDepth);

    var allowed = state.config['additional-allowed'] || [];
    $('additional-allowed').value = allowed
      .map(function (entry) {
        return typeof entry === 'string' ? entry : JSON.stringify(entry);
      })
      .join('\n');
    $('additional-entry-points').value = (
      state.config['additional-entry-points'] || []
    ).join('\n');
    $('additional-route-patterns').value = (
      state.config['additional-route-patterns'] || []
    ).join('\n');
  })();

  // --- dirty tracking ------------------------------------------------------
  form.addEventListener('input', function () {
    dirty = true;
  });
  window.addEventListener('beforeunload', function (e) {
    if (!dirty || saved) return undefined;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  // --- helpers -------------------------------------------------------------
  function lines(id) {
    return $(id)
      .value.split('\n')
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      });
  }

  function setStatus(kind, message) {
    statusBox.hidden = false;
    statusBox.setAttribute('data-kind', kind);
    statusBox.textContent = message;
  }

  function clearErrors() {
    var nodes = form.querySelectorAll('.error');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].hidden = true;
      nodes[i].textContent = '';
    }
    var inputs = form.querySelectorAll('[aria-invalid]');
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].removeAttribute('aria-invalid');
      inputs[j].removeAttribute('aria-describedby');
    }
  }

  function showFieldError(field, message) {
    var el = form.querySelector('[data-error-for="' + field + '"]');
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
    var input = $(field);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (el) {
        if (!el.id) el.id = input.id + '-error';
        input.setAttribute('aria-describedby', el.id);
      }
      var details = input.closest ? input.closest('details') : null;
      if (details && !details.open) details.open = true;
    }
  }

  function busy(btn, on, label) {
    btn.disabled = on;
    var span = btn.querySelector('.btn__label');
    if (on) {
      btn.dataset.label = span.textContent;
      span.textContent = label;
      var s = document.createElement('span');
      s.className = 'spinner';
      s.setAttribute('aria-hidden', 'true');
      btn.insertBefore(s, span);
    } else {
      if (btn.dataset.label) span.textContent = btn.dataset.label;
      var sp = btn.querySelector('.spinner');
      if (sp) sp.remove();
    }
  }

  function post(path, body) {
    return fetch(path + '?token=' + encodeURIComponent(TOKEN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // --- collect -------------------------------------------------------------
  function collectAllowed() {
    var entries = [];
    var raw = lines('additional-allowed');
    for (var i = 0; i < raw.length; i++) {
      var line = raw[i];
      if (line.charAt(0) === '{') {
        try {
          entries.push(JSON.parse(line));
        } catch (err) {
          showFieldError(
            'additional-allowed',
            'Line ' + (i + 1) + ' is not valid JSON: ' + line,
          );
          return null;
        }
      } else {
        entries.push(line);
      }
    }
    return entries;
  }

  function collectConfig() {
    var config = {
      version: state.config.version || '1.0',
      rules: {},
    };

    var enabledBoxes = form.querySelectorAll('[data-rule-enabled]');
    for (var i = 0; i < enabledBoxes.length; i++) {
      var id = enabledBoxes[i].getAttribute('data-rule-enabled');
      var severity = form.querySelector(
        '[data-rule-severity="' + id + '"]',
      ).value;
      var override = { enabled: enabledBoxes[i].checked, severity: severity };
      var exemptArea = form.querySelector('[data-rule-exempt="' + id + '"]');
      var exempt = exemptArea.value
        .split('\n')
        .map(function (line) {
          return line.trim();
        })
        .filter(function (line) {
          return line.length > 0;
        });
      if (exempt.length) override.exempt = exempt;
      config.rules[id] = override;
    }

    var language = $('language').value.trim();
    if (language) config.language = language;

    var maxDepthRaw = $('max-depth').value.trim();
    if (maxDepthRaw !== '') {
      var maxDepth = Number(maxDepthRaw);
      if (!isFinite(maxDepth) || maxDepth < 0) {
        showFieldError('max-depth', 'Enter a non-negative number.');
        return null;
      }
      config.scan = { maxDepth: maxDepth };
    }

    var allowed = collectAllowed();
    if (allowed === null) return null;
    if (allowed.length) config['additional-allowed'] = allowed;

    var entryPoints = lines('additional-entry-points');
    if (entryPoints.length) config['additional-entry-points'] = entryPoints;

    var routePatterns = lines('additional-route-patterns');
    if (routePatterns.length)
      config['additional-route-patterns'] = routePatterns;

    return config;
  }

  function collectRuleDocs() {
    var selections = {};
    var boxes = form.querySelectorAll('[data-doc-id]');
    for (var i = 0; i < boxes.length; i++)
      selections[boxes[i].getAttribute('data-doc-id')] = boxes[i].checked;

    var resync = [];
    var rboxes = form.querySelectorAll('[data-resync-id]');
    for (var j = 0; j < rboxes.length; j++) {
      var id = rboxes[j].getAttribute('data-resync-id');
      if (rboxes[j].checked && selections[id]) resync.push(id);
    }
    return { selections: selections, resync: resync };
  }

  // --- save ----------------------------------------------------------------
  function doSave(closeAfter) {
    clearErrors();
    var config = collectConfig();
    if (config === null) {
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      setStatus('error', 'Fix the highlighted fields, then save.');
      return;
    }
    var btn = closeAfter ? saveCloseBtn : saveBtn;
    busy(btn, true, 'Saving…');
    setStatus('info', 'Validating and saving…');
    post('/save', { config: config, ruleDocs: collectRuleDocs() })
      .then(function (r) {
        return r.json().then(function (res) {
          return { status: r.status, res: res };
        });
      })
      .then(function (out) {
        var res = out.res || {};
        if (out.status === 200 && res.success) {
          saved = true;
          dirty = false;
          var docs = res.ruleDocs || {};
          var parts = [];
          if (docs.copied && docs.copied.length)
            parts.push('applied ' + docs.copied.join(', '));
          if (docs.updated && docs.updated.length)
            parts.push('updated ' + docs.updated.join(', '));
          if (docs.removed && docs.removed.length)
            parts.push('removed ' + docs.removed.join(', '));
          var summary =
            'Saved' + (parts.length ? ' — ' + parts.join('; ') : '') + '.';
          busy(btn, false);
          if (closeAfter) {
            setStatus(
              'ok',
              summary +
                '\nReturn to Claude Code — setup continues automatically. This tab will close.',
            );
            saveBtn.disabled = saveCloseBtn.disabled = true;
            setTimeout(function () {
              window.close();
            }, 1400);
          } else {
            setStatus('ok', summary);
          }
        } else {
          var detail = Array.isArray(res.errors)
            ? '\n' + res.errors.join('\n')
            : '';
          setStatus('error', (res.message || 'Save failed.') + detail);
          busy(btn, false);
        }
      })
      .catch(function () {
        setStatus(
          'error',
          'Could not reach the local server. It may have timed out — rerun /filid:setup.',
        );
        busy(btn, false);
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    doSave(false);
  });
  saveCloseBtn.addEventListener('click', function () {
    doSave(true);
  });

  // --- cancel (close without saving) ---------------------------------------
  closeBtn.addEventListener('click', function () {
    dirty = false;
    post('/close', {}).finally(function () {
      window.close();
    });
  });
})();
