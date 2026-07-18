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

  var config = state.config;
  var bootstrap = state.bootstrap || {};

  // --- header ------------------------------------------------------------
  $('project-chip').textContent = state.projectRoot;
  $('project-chip').title = state.projectRoot;
  if (!state.configExists) $('init-note').hidden = false;

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
  for (var r = 0; r < radios.length; r++) {
    radios[r].checked = radios[r].value === config.provider;
    radios[r].addEventListener('change', syncProviderBlocks);
  }

  // --- project reference -------------------------------------------------
  (function renderProjectRef() {
    var ref = config.defaults.project_ref || '';
    var projects = bootstrap.jira_projects || [];
    if (projects.length > 0) {
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
    }
    if (config.provider === 'jira' && ref) $('jira-project-key').value = ref;
    if (config.provider === 'local' && ref) $('local-key').value = ref;
    if (!$('local-key').value) $('local-key').value = state.suggestedLocalKey;

    var repo =
      (config.github && config.github.repo) ||
      (config.provider === 'github' ? ref : '') ||
      bootstrap.github_repo ||
      '';
    if (repo) $('github-repo').value = repo;
  })();

  // --- labels & languages & defaults -------------------------------------
  function prefillGroup(attr, source) {
    var inputs = form.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < inputs.length; i++) {
      var key = inputs[i].getAttribute(attr);
      if (source && source[key] !== undefined && source[key] !== null)
        inputs[i].value = String(source[key]);
    }
  }
  prefillGroup('data-label-key', config.labels);
  prefillGroup('data-lang-key', config.language);
  prefillGroup('data-model-key', config.defaults.llm_model);
  prefillGroup('data-limit-key', config.defaults.subtask_limits);

  // --- Jira advanced maps -------------------------------------------------
  (function renderJiraMaps() {
    if (config.jira && config.jira.base_url)
      $('jira-base-url').value = config.jira.base_url;
    var host = $('jira-maps');
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
  })();

  // --- GitHub advanced ----------------------------------------------------
  (function renderGithubAdvanced() {
    var github = config.github || {};
    if (github.defaultLabels && github.defaultLabels.length)
      $('github-default-labels').value = github.defaultLabels.join('\n');

    var active = github.linkTypes || GITHUB_LINK_TYPES;
    var host = $('github-link-types');
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
  })();

  syncProviderBlocks();

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

  function collectSubtaskLimits() {
    var maxLines = positiveNumber('limit-max_lines', true);
    var maxFiles = positiveNumber('limit-max_files', true);
    var reviewHours = positiveNumber('limit-review_hours', false);
    if (maxLines === null || maxFiles === null || reviewHours === null)
      return null;
    return {
      max_lines: maxLines,
      max_files: maxFiles,
      review_hours: reviewHours,
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

    var subtaskLimits = collectSubtaskLimits();
    if (subtaskLimits === null) return null;

    var next = {
      version: config.version || '1.0',
      provider: provider,
      language: collectGroup('data-lang-key'),
      defaults: {
        project_ref: projectRef,
        codebase: config.defaults.codebase || null,
        llm_model: collectGroup('data-model-key'),
        subtask_limits: subtaskLimits,
      },
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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    var next = collect();
    if (next === null) {
      setStatus('error', 'Fix the highlighted fields, then save.');
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    var provision = next.provider === 'github' && $('provision-labels').checked;
    busy(saveBtn, true, 'Saving…');
    setStatus('info', 'Validating and saving…');
    post('/save', { config: next, options: { provision_labels: provision } })
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
          setStatus(
            'ok',
            'Saved — provider ' +
              next.provider +
              ', project ' +
              (next.defaults.project_ref || '(none)') +
              '.\nReturn to Claude Code — setup continues automatically. This tab will close.',
          );
          busy(saveBtn, false);
          saveBtn.disabled = true;
          setTimeout(function () {
            window.close();
          }, 1400);
        } else {
          var detail = Array.isArray(res.errors)
            ? '\n' + res.errors.join('\n')
            : '';
          setStatus('error', (res.message || 'Save failed.') + detail);
          busy(saveBtn, false);
        }
      })
      .catch(function () {
        setStatus(
          'error',
          'Could not reach the local server. It may have timed out — rerun /imbas:setup.',
        );
        busy(saveBtn, false);
      });
  });

  // --- close without saving ------------------------------------------------
  closeBtn.addEventListener('click', function () {
    dirty = false;
    post('/close', {}).finally(function () {
      window.close();
    });
  });
})();
