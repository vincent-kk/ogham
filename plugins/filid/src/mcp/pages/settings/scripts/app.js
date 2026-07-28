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

  // --- config scope (user / project) ---------------------------------------
  // Contract: cross-platform DETAIL.md "설정 페이지 계약". This page is minified
  // but never bundled (see buildSettingsHtml.mjs), so it cannot import the
  // shared merge helpers — it only needs the overridden-path list the server
  // already computed.
  var scopeState = (state && state.scope) || {
    paths: { user: '', project: '' },
    layers: { user: null, project: null },
    overridden: [],
  };
  // Opens on the layer that is currently deciding, so pressing Save without
  // touching the toggle rewrites the file the config already came from.
  var scope = scopeState.layers.project === null ? 'user' : 'project';

  // One normalized config per layer, so moving the toggle re-seats the form
  // without a round trip. The server normalizes both — this page has neither
  // the schema nor the defaults, and it is also what `collectConfig` starts
  // from, so a save under User never carries the project's overrides back
  // into the user file.
  var configByScope = (state && state.configByScope) || {
    user: {},
    project: {},
  };

  /**
   * The config document the chosen layer edits.
   *
   * @returns {object} That layer's normalized config.
   */
  function activeConfig() {
    return configByScope[scope] || {};
  }

  /**
   * The adapter whose entry-point overrides this layer's form edits. Layers
   * may enable different adapters, so it is read per layer with the server's
   * effective answer as the floor.
   *
   * @returns {string} The structure adapter id.
   */
  function adapterId() {
    var adapters = activeConfig().adapters || {};
    return (
      (adapters.enabled && adapters.enabled[0]) || state.structureAdapterId
    );
  }

  var SCOPE_OPTIONS = [
    ['user', 'User', 'Applies to every project you open.'],
    ['project', 'Project', 'Committed with the repository; outranks User.'],
  ];

  function renderScope() {
    var host = $('config_scope');
    // Rebuilding the group drops the focused radio, and the inputs are clipped
    // from view — losing focus here would leave arrow-key users with no cursor
    // and nothing on screen to say where it went.
    var hadFocus = host.contains(document.activeElement);
    host.textContent = '';
    SCOPE_OPTIONS.forEach(function (option) {
      var label = document.createElement('label');
      label.className = 'scope-option';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'config_scope';
      radio.value = option[0];
      radio.checked = option[0] === scope;
      radio.addEventListener('change', function () {
        scope = option[0];
        dirty = true;
        renderScope();
        applyScopeBadges();
        // Everything below answers "what does this layer say" — the form
        // fields, the rule list, and the channel the rule documents deploy
        // to. Leaving any of them behind shows one layer under the other's
        // name.
        applyScopeConfig();
        renderRuleDocs();
      });
      var text = document.createElement('span');
      text.textContent = option[1];
      label.appendChild(radio);
      label.appendChild(text);
      host.appendChild(label);
    });

    var chosen = SCOPE_OPTIONS.filter(function (option) {
      return option[0] === scope;
    })[0];
    renderScopeHint(chosen[2]);
    if (!hadFocus) return;
    var focused = host.querySelector('input:checked');
    if (focused) focused.focus();
  }

  /**
   * Writes the line under the lede: what the chosen layer means on the left,
   * the file it writes on the right. Two nodes rather than one string, so the
   * path can sit at the header's right edge without dragging the sentence
   * along with it.
   *
   * @param {string} meaning One-line description of the chosen layer.
   */
  function renderScopeHint(meaning) {
    var hint = $('scope_hint');
    hint.textContent = '';
    hint.appendChild(scopeHintPart('scope-hint__meaning', meaning));
    hint.appendChild(
      scopeHintPart('scope-hint__path', scopeState.paths[scope] || ''),
    );
  }

  /**
   * Builds one half of the hint line.
   *
   * @param {string} className Which half this is — meaning or path.
   * @param {string} text User-visible content, inserted as text never markup.
   * @returns {HTMLSpanElement} The span, not yet attached to the document.
   */
  function scopeHintPart(className, text) {
    var part = document.createElement('span');
    part.className = className;
    part.textContent = text;
    return part;
  }

  /**
   * Mark each config-owning section with where its value came from. No
   * clear-override button: filid's project layer is a committed file the team
   * owns, so removing it is a git operation rather than a settings click.
   */
  function applyScopeBadges() {
    var owners = document.querySelectorAll('[data-config-path]');
    for (var i = 0; i < owners.length; i++) {
      var path = owners[i].getAttribute('data-config-path');
      var overriding = scopeState.overridden.some(function (entry) {
        return entry === path || entry.indexOf(path + '.') === 0;
      });
      owners[i].setAttribute(
        'data-scope-state',
        scope === 'user' ? 'own' : overriding ? 'overridden' : 'inherited',
      );
    }
  }

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
    if (entry.displayTarget) {
      desc.appendChild(document.createTextNode(' · target: '));
      var target = document.createElement('code');
      target.textContent = entry.displayTarget;
      desc.appendChild(target);
    }

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

  // Both layers arrive up front so the toggle can redraw without a round trip.
  // The server resolves each channel because on a Codex host it is an owned
  // section of AGENTS.md rather than a directory — a path this page cannot
  // assemble from a channel and a filename.
  var EMPTY_LAYER = { entries: [], autoDeployed: [], displayTarget: null };
  var ruleLayers = (state.ruleDocs && state.ruleDocs.layers) || {
    user: EMPTY_LAYER,
    project: EMPTY_LAYER,
  };

  /**
   * Draw the rule documents for the layer the toggle currently names, and
   * redraw on every change of it. Each layer carries its own deployment state
   * and its own channel, so these are not the same rows with a different path.
   */
  function renderRuleDocs() {
    if (!state.ruleDocs.pluginRootResolved) {
      $('rule-docs-unavailable').hidden = false;
      return;
    }
    var docs = ruleLayers[scope] || EMPTY_LAYER;
    var required = docs.autoDeployed || [];
    var optional = docs.entries || [];

    var targets = document.querySelectorAll('[data-rules-target]');
    for (var t = 0; t < targets.length; t++)
      targets[t].textContent =
        docs.displayTarget || 'the active host rule channel';
    // Required documents belong on screen even when no checkbox does: the
    // toggle decides which channel they deploy to, and these rows are the
    // only place that answer appears.
    $('rule-docs-section').hidden =
      required.length === 0 && optional.length === 0;

    var requiredList = $('rule-docs-required');
    var optionalList = $('rule-docs-optional');
    requiredList.textContent = '';
    optionalList.textContent = '';
    required.forEach(function (entry) {
      requiredList.appendChild(docRow(entry, true));
    });
    optional.forEach(function (entry) {
      optionalList.appendChild(docRow(entry, false));
    });
  }

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

  /**
   * Draw the structural rules the chosen layer configures. The list is
   * rebuilt rather than patched: two layers may name different rule sets.
   */
  function renderRules() {
    var list = $('rules-list');
    list.textContent = '';
    var rules = activeConfig().rules || {};
    Object.keys(rules).forEach(function (id) {
      list.appendChild(ruleItem(id, rules[id] || {}));
    });
  }

  // --- prefill: general & structure exceptions ----------------------------
  /** Seat the general and structure fields on the chosen layer's config. */
  function prefillConfig() {
    var config = activeConfig();
    $('language').value = config.language || '';
    var structure = config.structure || {};
    // Assigned either way: a layer that sets no depth must clear the value the
    // other layer left in the field.
    $('max-depth').value =
      typeof structure.maxDepth === 'number' ? String(structure.maxDepth) : '';

    var allowed = structure.additionalAllowedPeers || [];
    $('additional-allowed').value = allowed
      .map(function (entry) {
        if (
          entry &&
          typeof entry === 'object' &&
          typeof entry.basename === 'string' &&
          !entry.paths &&
          !entry.adapterId
        )
          return entry.basename;
        return JSON.stringify(entry);
      })
      .join('\n');
    var entryPointOverrides = structure.entryPointOverrides || {};
    $('additional-entry-points').value = (
      entryPointOverrides[adapterId()] || []
    ).join('\n');
    $('additional-organ-names').value = (
      structure.additionalOrganNames || []
    ).join('\n');
  }

  /**
   * Re-seat every config-backed field on the layer the toggle now names.
   * The rule list is part of it: which rules exist is a config question, and
   * two layers can answer it differently.
   */
  function applyScopeConfig() {
    renderRules();
    prefillConfig();
  }

  applyScopeConfig();

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
        entries.push({ basename: line });
      }
    }
    return entries;
  }

  function collectConfig() {
    var config = JSON.parse(JSON.stringify(activeConfig()));
    config.version = '2.0';
    config.rules = {};

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
    else delete config.language;

    var structure = config.structure
      ? JSON.parse(JSON.stringify(config.structure))
      : {};
    var maxDepthRaw = $('max-depth').value.trim();
    if (maxDepthRaw !== '') {
      var maxDepth = Number(maxDepthRaw);
      if (!isFinite(maxDepth) || maxDepth < 0) {
        showFieldError('max-depth', 'Enter a non-negative number.');
        return null;
      }
      structure.maxDepth = maxDepth;
    } else delete structure.maxDepth;

    var allowed = collectAllowed();
    if (allowed === null) return null;
    if (allowed.length) structure.additionalAllowedPeers = allowed;
    else delete structure.additionalAllowedPeers;

    var entryPoints = lines('additional-entry-points');
    var entryPointOverrides = structure.entryPointOverrides || {};
    if (entryPoints.length) entryPointOverrides[adapterId()] = entryPoints;
    else delete entryPointOverrides[adapterId()];
    if (Object.keys(entryPointOverrides).length)
      structure.entryPointOverrides = entryPointOverrides;
    else delete structure.entryPointOverrides;

    var organNames = lines('additional-organ-names');
    if (organNames.length) structure.additionalOrganNames = organNames;
    else delete structure.additionalOrganNames;

    if (Object.keys(structure).length) config.structure = structure;
    else delete config.structure;

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
    post('/save', {
      scope: scope,
      config: config,
      ruleDocs: collectRuleDocs(),
    })
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
          // filid has no dry run, so a move between layers is reported after
          // the fact rather than confirmed before it.
          if (docs.otherScope && docs.otherScope.filenames.length)
            parts.push(
              'withdrew ' +
                docs.otherScope.filenames.join(', ') +
                ' from the ' +
                docs.otherScope.scope +
                ' layer (' +
                docs.otherScope.displayTarget +
                ')',
            );
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

  renderScope();
  applyScopeBadges();
  renderRuleDocs();

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
