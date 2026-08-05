(function () {
  'use strict';

  var state =
    typeof window.__IMBAS_STATE__ === 'object' ? window.__IMBAS_STATE__ : null;
  // The server issues a per-session token; every request must echo it back.
  var TOKEN = new URLSearchParams(window.location.search).get('token') || '';
  var GITHUB_LINK_TYPES = [
    'blocks',
    'blocked-by',
    'split-from',
    'split-into',
    'relates',
  ];
  var JIRA_MAPS = [
    { key: 'issue_types', title: 'Issue types' },
    { key: 'workflow_states', title: 'Workflow states' },
    { key: 'link_types', title: 'Link types' },
  ];

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
      'Settings state failed to load. Reopen this page from Claude Code (/imbas:setup).',
    );
    saveBtn.disabled = true;
    return;
  }

  // One normalized config per layer, so moving the toggle re-seats the form
  // without a round trip. The server normalizes both — this page knows neither
  // the schema nor its defaults.
  var configByScope = state.configByScope || { user: {}, project: {} };
  // The layer currently being edited. `applyScopeConfig` re-points it.
  var config = {};
  var bootstrap = state.bootstrap || {};

  // --- header ------------------------------------------------------------
  $('project-chip').textContent = state.projectRoot;
  $('project-chip').title = state.projectRoot;
  if (!state.configExists) $('init-note').hidden = false;

  // --- config scope (user / project) ---------------------------------------
  // Contract: cross-platform DETAIL.md "설정 페이지 계약". This page is minified
  // but never bundled, so it cannot import the shared merge helpers — it only
  // needs to name the layer it is writing.
  var scopeState = state.scope || {
    paths: { user: '', project: null },
    layers: { user: null, project: null },
    overridden: [],
  };
  // Open on the layer that is currently deciding, so pressing Save without
  // touching the toggle rewrites the file the config already came from.
  var scope = scopeState.layers.project === null ? 'user' : 'project';

  function renderScope() {
    var host = $('config_scope');
    if (!host) return;
    // Rebuilding the group drops the focused radio, and the inputs are clipped
    // from view — losing focus here would leave arrow-key users with no cursor
    // and nothing on screen to say where it went.
    var hadFocus = host.contains(document.activeElement);
    host.textContent = '';
    [
      ['user', 'User', 'Applies to every workspace you open.'],
      ['project', 'Project', 'Committed with the repository; overrides User.'],
    ].forEach(function (option) {
      var label = document.createElement('label');
      label.className = 'scope-option';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'config_scope';
      radio.value = option[0];
      radio.checked = option[0] === scope;
      radio.disabled = option[0] === 'project' && !scopeState.paths.project;
      radio.addEventListener('change', function () {
        scope = option[0];
        applyScopeConfig();
        renderScope();
      });
      var text = document.createElement('span');
      text.textContent = option[1];
      label.appendChild(radio);
      label.appendChild(text);
      host.appendChild(label);
      if (option[0] === scope) renderScopeHint(option[2]);
    });
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
    if (!hint) return;
    hint.textContent = '';
    var unavailable = scope === 'project' && !scopeState.paths.project;
    hint.appendChild(
      scopeHintPart(
        'scope-hint__meaning',
        unavailable
          ? 'No project root is available, so only User can be edited.'
          : meaning,
      ),
    );
    if (unavailable) return;
    hint.appendChild(
      scopeHintPart('scope-hint__path', scopeState.paths[scope] || ''),
    );
  }

  /**
   * Builds one span of the hint line.
   *
   * @param {string} className Class that decides which edge the part sits on.
   * @param {string} text Plain text; never markup — this page assigns
   *   textContent only.
   * @returns {HTMLSpanElement} The detached span, ready to append.
   */
  function scopeHintPart(className, text) {
    var part = document.createElement('span');
    part.className = className;
    part.textContent = text;
    return part;
  }

  renderScope();

  // --- provider radios + availability hints ------------------------------
  function providerHint(name) {
    if (name === 'local') return { text: 'always available', tone: 'ok' };
    var known = bootstrap.providers || {};
    if (known[name] === true) return { text: 'detected', tone: 'ok' };
    if (known[name] === false) return { text: 'not detected', tone: 'warn' };
    return { text: 'unchecked', tone: '' };
  }

  ['jira', 'github', 'local'].forEach(function (name) {
    var hint = providerHint(name);
    var el = form.querySelector('[data-provider-hint="' + name + '"]');
    el.textContent = hint.text;
    if (hint.tone) el.setAttribute('data-tone', hint.tone);
  });

  function selectedProvider() {
    var checked = form.querySelector('input[name="provider"]:checked');
    return checked ? checked.value : 'jira';
  }

  function syncProviderBlocks() {
    var provider = selectedProvider();
    var blocks = document.querySelectorAll('.provider-only');
    for (var i = 0; i < blocks.length; i++)
      blocks[i].hidden =
        blocks[i].getAttribute('data-for-provider') !== provider;
  }

  var radios = form.querySelectorAll('input[name="provider"]');
  for (var r = 0; r < radios.length; r++)
    radios[r].addEventListener('change', syncProviderBlocks);

  /** Tick the provider the chosen layer names. */
  function prefillProvider() {
    for (var i = 0; i < radios.length; i++)
      radios[i].checked = radios[i].value === config.provider;
  }

  // --- project reference -------------------------------------------------
  // The Jira project list comes from the session bootstrap, not from either
  // config layer, so it is populated once — re-running it on every toggle
  // would stack duplicate options.
  (function populateProjectOptions() {
    var projects = bootstrap.jira_projects || [];
    if (projects.length === 0) return;
    $('jira-select-wrap').hidden = false;
    var select = $('jira-project-select');
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '— pick a project —';
    select.appendChild(blank);
    projects.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.key;
      opt.textContent = p.name ? p.key + ' — ' + p.name : p.key;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      if (select.value) $('jira-project-key').value = select.value;
    });
  })();

  /** Seat the project-reference fields on the chosen layer. */
  function prefillProjectRef() {
    var ref = (config.defaults || {}).project_ref || '';
    $('jira-project-key').value = config.provider === 'jira' ? ref : '';
    $('local-key').value =
      config.provider === 'local' && ref ? ref : state.suggestedLocalKey;
    $('github-repo').value =
      (config.github && config.github.repo) ||
      (config.provider === 'github' ? ref : '') ||
      bootstrap.github_repo ||
      '';
  }

  // --- labels & languages & defaults -------------------------------------
  function prefillGroup(attr, source) {
    var inputs = form.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < inputs.length; i++) {
      var key = inputs[i].getAttribute(attr);
      var value = source ? source[key] : undefined;
      // Assigned either way: a layer that omits a key has to clear what the
      // other layer left in the field.
      inputs[i].value =
        value === undefined || value === null ? '' : String(value);
    }
  }

  /** Seat the label, language, model and estimation groups on the chosen layer. */
  function prefillGroups() {
    var defaults = config.defaults || {};
    var estimation = config.estimation || {};
    prefillGroup('data-label-key', config.labels);
    prefillGroup('data-lang-key', config.language);
    prefillGroup('data-model-key', defaults.llm_model);
    prefillGroup('data-est-key', estimation);
    prefillGroup('data-est-complexity', estimation.complexity_baseline);
    prefillGroup('data-est-overhead', estimation.overhead_ratio);
  }

  // --- Jira advanced maps -------------------------------------------------
  /** Redraw the Jira maps from the chosen layer; the groups are its values. */
  function renderJiraMaps() {
    $('jira-base-url').value = (config.jira && config.jira.base_url) || '';
    var host = $('jira-maps');
    host.textContent = '';
    JIRA_MAPS.forEach(function (map) {
      var values = (config.jira && config.jira[map.key]) || {};
      // An empty map would render as an orphan group title — skip it.
      if (Object.keys(values).length === 0) return;
      var group = document.createElement('div');
      group.className = 'kvgroup';
      var title = document.createElement('p');
      title.className = 'kvgroup-title';
      title.textContent = map.title;
      group.appendChild(title);
      var grid = document.createElement('div');
      grid.className = 'kvgrid';
      Object.keys(values).forEach(function (key) {
        var id = 'jira-' + map.key + '-' + key;
        var label = document.createElement('label');
        label.setAttribute('for', id);
        label.textContent = key;
        var input = document.createElement('input');
        input.type = 'text';
        input.id = id;
        input.value = values[key];
        input.setAttribute('data-jira-map', map.key);
        input.setAttribute('data-jira-key', key);
        grid.appendChild(label);
        grid.appendChild(input);
      });
      group.appendChild(grid);
      host.appendChild(group);
    });
  }

  // --- GitHub advanced ----------------------------------------------------
  /** Redraw the GitHub advanced block from the chosen layer. */
  function renderGithubAdvanced() {
    var github = config.github || {};
    $('github-default-labels').value = (github.defaultLabels || []).join('\n');

    var active = github.linkTypes || GITHUB_LINK_TYPES;
    var host = $('github-link-types');
    host.textContent = '';
    GITHUB_LINK_TYPES.forEach(function (name) {
      var label = document.createElement('label');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = active.indexOf(name) !== -1;
      box.setAttribute('data-link-type', name);
      label.appendChild(box);
      label.appendChild(document.createTextNode(name));
      host.appendChild(label);
    });
  }

  /**
   * Re-seat every config-backed field on the layer the toggle now names.
   * Session-supplied values — the Jira project list, the detected repo — are
   * not part of it: they belong to neither layer.
   */
  function applyScopeConfig() {
    config = configByScope[scope] || {};
    prefillProvider();
    prefillProjectRef();
    prefillGroups();
    renderJiraMaps();
    renderGithubAdvanced();
    syncProviderBlocks();
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
    var input = $(field);
    var el = form.querySelector('[data-error-for="' + field + '"]');
    if (el) {
      el.id = field + '-error';
      el.textContent = message;
      el.hidden = false;
      if (input) input.setAttribute('aria-describedby', el.id);
    }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
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

  function collectGroup(attr) {
    var out = {};
    var inputs = form.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < inputs.length; i++)
      out[inputs[i].getAttribute(attr)] = inputs[i].value.trim();
    return out;
  }

  function positiveNumber(id, integer) {
    var raw = $(id).value.trim();
    var n = Number(raw);
    if (raw === '' || !isFinite(n) || n <= 0 || (integer && n % 1 !== 0)) {
      showFieldError(
        id,
        integer ? 'Enter a positive integer.' : 'Enter a positive number.',
      );
      return null;
    }
    return n;
  }

  function nonNegativeNumber(id) {
    var raw = $(id).value.trim();
    var n = Number(raw);
    if (raw === '' || !isFinite(n) || n < 0) {
      showFieldError(id, 'Enter zero or a positive number.');
      return null;
    }
    return n;
  }

  // --- collect -------------------------------------------------------------
  function collectJiraProjectRef() {
    var projectRef = $('jira-project-key').value.trim() || null;
    if (!projectRef) {
      showFieldError('jira-project-key', 'Enter a Jira project key.');
      return null;
    }
    return projectRef;
  }

  function collectGithubProjectRef() {
    var repo = $('github-repo').value.trim();
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
      showFieldError('github-repo', 'Enter the repository as owner/name.');
      return null;
    }
    return repo;
  }

  function collectLocalProjectRef() {
    return $('local-key').value.trim().toUpperCase() || 'LOCAL';
  }

  function collectProjectRef(provider) {
    if (provider === 'jira') return collectJiraProjectRef();
    if (provider === 'github') return collectGithubProjectRef();
    return collectLocalProjectRef();
  }

  function collectEstimation() {
    var teamSize = positiveNumber('est-team_size', true);
    var mandayPerWeek = positiveNumber('est-manday_per_week', false);
    var bufferRatio = nonNegativeNumber('est-buffer_ratio');
    var cxS = positiveNumber('est-cx-S', false);
    var cxM = positiveNumber('est-cx-M', false);
    var cxL = positiveNumber('est-cx-L', false);
    var cxXL = positiveNumber('est-cx-XL', false);
    var ohIntegration = nonNegativeNumber('est-oh-integration');
    var ohTest = nonNegativeNumber('est-oh-test');
    var ohPm = nonNegativeNumber('est-oh-pm');
    if (
      teamSize === null ||
      mandayPerWeek === null ||
      bufferRatio === null ||
      cxS === null ||
      cxM === null ||
      cxL === null ||
      cxXL === null ||
      ohIntegration === null ||
      ohTest === null ||
      ohPm === null
    )
      return null;
    return {
      team_size: teamSize,
      available_manday_per_week: mandayPerWeek,
      complexity_baseline: { S: cxS, M: cxM, L: cxL, XL: cxXL },
      overhead_ratio: { integration: ohIntegration, test: ohTest, pm: ohPm },
      buffer_ratio: bufferRatio,
    };
  }

  function collectJiraSection() {
    var jira = {
      base_url: $('jira-base-url').value.trim() || null,
      issue_types: {},
      workflow_states: {},
      link_types: {},
      phase_to_workflow:
        (config.jira && config.jira.phase_to_workflow) || undefined,
    };
    var mapInputs = form.querySelectorAll('[data-jira-map]');
    for (var i = 0; i < mapInputs.length; i++) {
      var map = mapInputs[i].getAttribute('data-jira-map');
      var key = mapInputs[i].getAttribute('data-jira-key');
      jira[map][key] = mapInputs[i].value.trim();
    }
    return jira;
  }

  function collectGithubLinkTypes() {
    var linkTypes = [];
    var boxes = form.querySelectorAll('[data-link-type]');
    for (var b = 0; b < boxes.length; b++)
      if (boxes[b].checked)
        linkTypes.push(boxes[b].getAttribute('data-link-type'));
    return linkTypes;
  }

  function collectGithubSection(projectRef) {
    return {
      repo: projectRef,
      defaultLabels: $('github-default-labels')
        .value.split('\n')
        .map(function (line) {
          return line.trim();
        })
        .filter(function (line) {
          return line.length > 0;
        }),
      linkTypes: collectGithubLinkTypes(),
    };
  }

  function collect() {
    var provider = selectedProvider();

    var projectRef = collectProjectRef(provider);
    if (projectRef === null) return null;

    var estimation = collectEstimation();
    if (estimation === null) return null;

    var next = {
      version: config.version || '2.0',
      provider: provider,
      language: collectGroup('data-lang-key'),
      defaults: {
        project_ref: projectRef,
        codebase: (config.defaults || {}).codebase || null,
        llm_model: collectGroup('data-model-key'),
      },
      estimation: estimation,
      labels: collectGroup('data-label-key'),
      jira: collectJiraSection(),
    };

    if (provider === 'github') {
      next.github = collectGithubSection(projectRef);
    } else if (config.github) {
      // Preserve a previously configured GitHub section when another
      // provider is active, so switching back does not lose it.
      next.github = config.github;
    }

    return next;
  }

  // --- save ----------------------------------------------------------------
  function doSave(closeAfter) {
    clearErrors();
    var next = collect();
    if (next === null) {
      setStatus('error', 'Fix the highlighted fields, then save.');
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    var provision = next.provider === 'github' && $('provision-labels').checked;
    var btn = closeAfter ? saveCloseBtn : saveBtn;
    busy(btn, true, 'Saving…');
    setStatus('info', 'Validating and saving…');
    post('/save', {
      scope: scope,
      config: next,
      options: { provision_labels: provision },
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
          var summary =
            'Saved — provider ' +
            next.provider +
            ', project ' +
            (next.defaults.project_ref || '(none)') +
            '.';
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
          'Could not reach the local server. It may have timed out — rerun /imbas:setup.',
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
