/* global window, document, fetch */
(function () {
  'use strict';

  // This file runs standalone in the browser — it cannot import
  // src/constants/. The values below are the page's half of contracts the
  // server states in src/constants/http.ts and intervention.ts; the wiring
  // test is what keeps the two halves from drifting apart.
  var ROUTE = { PLAN: '/plan', SAVE: '/save', CLOSE: '/close' };
  var TOKEN_PARAM = 'token';
  var DIAL_ADVISORY = 'advisory';
  var DIAL_STANDARD = 'standard';
  var CONFIG_LABEL = '.seiri/config.json';
  var CONTENT_TYPE_JSON = 'application/json';

  var state = window.__SEIRI_STATE__;
  if (!state || typeof state !== 'object') return;

  var TOKEN =
    new URLSearchParams(window.location.search).get(TOKEN_PARAM) || '';

  var DIAL_OPTIONS = [
    {
      value: DIAL_ADVISORY,
      label: DIAL_ADVISORY,
      description:
        'One line at session start naming the active rules. The quiet floor: nothing is asserted that the repository did not ask for.',
    },
    {
      value: DIAL_STANDARD,
      label: DIAL_STANDARD,
      description:
        'The default. Also states the dial position, names the workflow that owns each moment — including in subagents, which inherit nothing else — and adds a brief skill-dispatch reminder at the start of every turn.',
    },
    {
      value: 'strict',
      label: 'strict',
      description:
        'Also restates the precedence chain each session — useful where repository conventions and these rules meet often — names every moment’s owning skill outright, and widens that per-turn reminder to borderline work.',
    },
  ];

  var entries = state.ruleDocs.entries || [];
  var anyDeployed = entries.some(function (entry) {
    return entry.deployed;
  });

  // A project that has deployed nothing gets the recommended set offered;
  // one that already chose gets its own choices back, read from disk. That
  // way deleting a rule file by hand is respected rather than re-applied.
  var selections = {};
  var resync = {};
  entries.forEach(function (entry) {
    selections[entry.id] = anyDeployed ? entry.deployed : entry.recommended;
    resync[entry.id] = Boolean(entry.deployed && !entry.inSync);
  });

  var intervention =
    (state.config && state.config.intervention) || DIAL_STANDARD;
  var previewRevision = null;

  // Which layer a save lands in. Opens on the layer that is currently
  // deciding, so pressing Save without touching the toggle rewrites the file
  // the dial already came from rather than silently creating a second one.
  var scopeState = state.scope || {
    paths: { user: '', project: '' },
    layers: { user: null, project: null },
    overridden: [],
  };
  var scope = scopeState.layers.project === null ? 'user' : 'project';

  var elements = {
    root: document.getElementById('project-root'),
    rules: document.getElementById('rules-list'),
    dial: document.getElementById('dial'),
    scopeToggle: document.getElementById('config_scope'),
    scopeHint: document.getElementById('scope_hint'),
    facts: document.getElementById('facts'),
    preview: document.getElementById('preview'),
    status: document.getElementById('status'),
    save: document.getElementById('save'),
    saveClose: document.getElementById('save-close'),
    close: document.getElementById('close'),
    ruleTargets: document.querySelectorAll('[data-rules-target]'),
  };

  function setStatus(kind, message) {
    elements.status.hidden = false;
    elements.status.setAttribute('data-kind', kind);
    elements.status.textContent = message || '';
  }

  function body() {
    return {
      scope: scope,
      config: { intervention: intervention },
      ruleDocs: {
        selections: selections,
        resync: Object.keys(resync).filter(function (id) {
          return resync[id];
        }),
        revision: previewRevision,
      },
    };
  }

  function post(path, payload) {
    return fetch(path + '?' + TOKEN_PARAM + '=' + encodeURIComponent(TOKEN), {
      method: 'POST',
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      body: JSON.stringify(payload),
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || data.success === false)
          throw new Error(data.message || 'Request failed');
        return data;
      });
    });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderRules() {
    elements.rules.textContent = '';

    if (entries.length === 0) {
      elements.rules.appendChild(
        element(
          'p',
          'empty',
          'This build ships no rule documents yet. Nothing to select.',
        ),
      );
      return;
    }

    entries.forEach(function (entry) {
      var card = element('div', 'rule');
      var main = element('div', 'rule-main');

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'rule-' + entry.id;
      checkbox.checked = Boolean(selections[entry.id]);
      checkbox.addEventListener('change', function () {
        selections[entry.id] = checkbox.checked;
        previewRevision = null;
        refreshPreview();
      });

      var text = element('div', 'rule-text');
      var title = element('label', 'rule-title');
      title.htmlFor = checkbox.id;
      title.appendChild(element('span', null, entry.title));
      if (entry.recommended)
        title.appendChild(element('span', 'tag', 'recommended'));
      if (entry.deployed && !entry.inSync)
        title.appendChild(element('span', 'tag tag-drift', 'edited locally'));

      text.appendChild(title);
      text.appendChild(element('p', 'rule-desc', entry.description));
      text.appendChild(element('p', 'rule-file', entry.displayTarget));

      main.appendChild(checkbox);
      main.appendChild(text);
      card.appendChild(main);

      if (entry.deployed && !entry.inSync) card.appendChild(driftBlock(entry));

      elements.rules.appendChild(card);
    });
  }

  function driftBlock(entry) {
    var block = element('div', 'rule-drift');
    block.appendChild(
      element(
        'p',
        null,
        'The deployed copy of this rule differs from the one this build ships. The latest shipped version is selected by default; uncheck below to keep your edits.',
      ),
    );

    var label = document.createElement('label');
    var overwrite = document.createElement('input');
    overwrite.type = 'checkbox';
    overwrite.checked = Boolean(resync[entry.id]);
    overwrite.addEventListener('change', function () {
      resync[entry.id] = overwrite.checked;
      previewRevision = null;
      refreshPreview();
    });
    label.appendChild(overwrite);
    label.appendChild(element('span', null, 'Use the latest shipped version'));
    block.appendChild(label);
    return block;
  }

  function renderDial() {
    elements.dial.textContent = '';
    DIAL_OPTIONS.forEach(function (option) {
      var card = element('label', 'dial-option');
      if (option.value === intervention) card.classList.add('is-selected');

      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'intervention';
      radio.value = option.value;
      radio.checked = option.value === intervention;
      radio.addEventListener('change', function () {
        intervention = option.value;
        renderDial();
      });

      var text = element('div', 'dial-text');
      text.appendChild(element('div', 'dial-name', option.label));
      text.appendChild(element('p', 'dial-desc', option.description));

      card.appendChild(radio);
      card.appendChild(text);
      elements.dial.appendChild(card);
    });
  }

  var SCOPE_OPTIONS = [
    ['user', 'User', 'Applies to every project you open.'],
    ['project', 'Project', 'Committed with the repository; outranks User.'],
  ];

  function renderScope() {
    // Rebuilding the group drops the focused radio, and the inputs are clipped
    // from view — losing focus here would leave arrow-key users with no cursor
    // and nothing on screen to say where it went.
    var hadFocus = elements.scopeToggle.contains(document.activeElement);
    elements.scopeToggle.textContent = '';
    SCOPE_OPTIONS.forEach(function (option) {
      var label = element('label', 'scope-option');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'config_scope';
      radio.value = option[0];
      radio.checked = option[0] === scope;
      radio.addEventListener('change', function () {
        scope = option[0];
        applyScopeBadges();
        renderScope();
      });
      label.appendChild(radio);
      label.appendChild(element('span', null, option[1]));
      elements.scopeToggle.appendChild(label);
    });

    var chosen = SCOPE_OPTIONS.filter(function (option) {
      return option[0] === scope;
    })[0];
    // Two nodes rather than one string: what the layer means keeps the
    // section's left edge while the file it writes sits at the right, and CSS
    // cannot pull the two ends of a single text node apart.
    elements.scopeHint.textContent = '';
    elements.scopeHint.appendChild(
      element('span', 'scope-hint__meaning', chosen[2]),
    );
    elements.scopeHint.appendChild(
      element('span', 'scope-hint__path', scopeState.paths[scope]),
    );

    if (!hadFocus) return;
    var focused = elements.scopeToggle.querySelector('input:checked');
    if (focused) focused.focus();
  }

  /**
   * Mark every [data-config-path] with where its value came from. There is no
   * clear-override button here: seiri's project layer is a committed file the
   * team owns, so removing it is a git operation, not a settings click.
   */
  function applyScopeBadges() {
    var owners = document.querySelectorAll('[data-config-path]');
    var i;
    for (i = 0; i < owners.length; i += 1) {
      var path = owners[i].getAttribute('data-config-path');
      var overriding = scopeState.overridden.indexOf(path) !== -1;
      owners[i].setAttribute(
        'data-scope-state',
        scope === 'user' ? 'own' : overriding ? 'overridden' : 'inherited',
      );
    }
  }

  function renderFacts() {
    elements.facts.textContent = '';
    var facts = [
      ['project', state.projectRoot],
      ['config', state.configExists ? CONFIG_LABEL : 'not created yet'],
      ['rules', String(entries.length) + ' available in this build'],
    ];
    facts.forEach(function (pair) {
      elements.facts.appendChild(element('dt', null, pair[0]));
      elements.facts.appendChild(element('dd', null, pair[1]));
    });
  }

  function renderRuleTargets() {
    var targets = entries
      .map(function (entry) {
        return entry.activeDisplayTarget;
      })
      .filter(function (target, index, all) {
        return target && all.indexOf(target) === index;
      });
    var label =
      targets.length === 1
        ? targets[0]
        : (function () {
            var first = targets[0] || '';
            var slash = Math.max(
              first.lastIndexOf('/'),
              first.lastIndexOf('\\'),
            );
            var directory = first.slice(0, slash + 1);
            var sharesDirectory =
              directory &&
              targets.every(function (target) {
                var remainder = target.slice(directory.length);
                return (
                  target.indexOf(directory) === 0 &&
                  remainder.indexOf('/') === -1 &&
                  remainder.indexOf('\\') === -1
                );
              });
            return sharesDirectory
              ? directory
              : targets.join(', ') || 'the active host rule channel';
          })();
    elements.ruleTargets.forEach(function (node) {
      node.textContent = label;
    });
  }

  var MARKS = {
    copy: '+',
    update: '~',
    remove: '−',
    drift: '!',
    skip: '!',
    unchanged: '·',
  };

  function renderPreview(result) {
    elements.preview.textContent = '';
    var outcomes = (result.outcomes || []).filter(function (outcome) {
      return outcome.action !== 'unchanged';
    });

    if (outcomes.length === 0) {
      elements.preview.appendChild(
        element('p', 'empty', 'Nothing would change.'),
      );
      return;
    }

    var list = element('div', 'diff');
    outcomes.forEach(function (outcome) {
      var row = element('div', 'diff-row');
      row.setAttribute('data-action', outcome.action);
      row.appendChild(
        element('span', 'diff-mark', MARKS[outcome.action] || '?'),
      );
      row.appendChild(element('span', 'diff-file', outcome.filename));
      row.appendChild(
        element(
          'span',
          'diff-note',
          outcome.reason
            ? outcome.action + ' — ' + outcome.reason
            : outcome.action,
        ),
      );
      list.appendChild(row);
    });
    elements.preview.appendChild(list);
  }

  var previewToken = 0;
  function refreshPreview() {
    var current = ++previewToken;
    return post(ROUTE.PLAN, body())
      .then(function (data) {
        if (current !== previewToken) return;
        previewRevision =
          typeof data.ruleDocs.revision === 'string'
            ? data.ruleDocs.revision
            : null;
        renderPreview(data.ruleDocs);
      })
      .catch(function (err) {
        if (current !== previewToken) return;
        previewRevision = null;
        elements.preview.textContent = '';
        elements.preview.appendChild(
          element('p', 'empty', 'Preview unavailable: ' + err.message),
        );
      });
  }

  function setBusy(busy) {
    [elements.save, elements.saveClose, elements.close].forEach(function (btn) {
      btn.disabled = busy;
    });
  }

  function save(thenClose) {
    previewToken += 1;
    setBusy(true);
    setStatus('info', 'Saving…');
    post(ROUTE.SAVE, body())
      .then(function (data) {
        previewRevision =
          typeof data.ruleDocs.revision === 'string'
            ? data.ruleDocs.revision
            : null;
        renderPreview(data.ruleDocs);
        if (data.ruleDocs.applied === false) {
          previewRevision = null;
          setStatus('error', 'The preview changed. Review it and save again.');
          return refreshPreview().then(function () {
            setBusy(false);
          });
        }
        setStatus('ok', 'Saved. You can return to the session.');
        if (thenClose) return post(ROUTE.CLOSE, {}).then(closeWindow);
        setBusy(false);
        return undefined;
      })
      .catch(function (err) {
        previewRevision = null;
        setStatus('error', err.message);
        return refreshPreview().then(function () {
          setBusy(false);
        });
      });
  }

  function closeWindow() {
    setStatus('ok', 'Saved. This tab can be closed.');
    window.close();
  }

  elements.save.addEventListener('click', function () {
    save(false);
  });
  elements.saveClose.addEventListener('click', function () {
    save(true);
  });
  elements.close.addEventListener('click', function () {
    setBusy(true);
    setStatus('info', 'Closing…');
    post(ROUTE.CLOSE, {})
      .then(function () {
        window.close();
      })
      .catch(function (err) {
        setStatus('error', err.message);
        setBusy(false);
      });
  });

  elements.root.textContent = state.projectRoot;
  renderRules();
  renderDial();
  renderScope();
  applyScopeBadges();
  renderFacts();
  renderRuleTargets();
  refreshPreview();
})();
