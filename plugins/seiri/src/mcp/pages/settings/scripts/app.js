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
  var RULES_DIR_LABEL = '.claude/rules/';
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
        'One line at session start naming the active rules. The default, and the floor: nothing is asserted that the repository did not ask for.',
    },
    {
      value: 'standard',
      label: 'standard',
      description:
        'Also states the dial position, so a long session can tell which posture it is operating under.',
    },
    {
      value: 'strict',
      label: 'strict',
      description:
        'Also restates the precedence chain each session — useful where repository conventions and these rules meet often.',
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
    resync[entry.id] = false;
  });

  var intervention =
    (state.config && state.config.intervention) || DIAL_ADVISORY;

  var elements = {
    root: document.getElementById('project-root'),
    rules: document.getElementById('rules-list'),
    dial: document.getElementById('dial'),
    facts: document.getElementById('facts'),
    preview: document.getElementById('preview'),
    status: document.getElementById('status'),
    save: document.getElementById('save'),
    saveClose: document.getElementById('save-close'),
    close: document.getElementById('close'),
  };

  function setStatus(kind, message) {
    elements.status.hidden = false;
    elements.status.setAttribute('data-kind', kind);
    elements.status.textContent = message || '';
  }

  function body() {
    return {
      config: { intervention: intervention },
      ruleDocs: {
        selections: selections,
        resync: Object.keys(resync).filter(function (id) {
          return resync[id];
        }),
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
      text.appendChild(
        element('p', 'rule-file', RULES_DIR_LABEL + entry.filename),
      );

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
        'The deployed copy of this rule differs from the one this build ships. Your edits are kept unless you say otherwise.',
      ),
    );

    var label = document.createElement('label');
    var overwrite = document.createElement('input');
    overwrite.type = 'checkbox';
    overwrite.checked = false;
    overwrite.addEventListener('change', function () {
      resync[entry.id] = overwrite.checked;
      refreshPreview();
    });
    label.appendChild(overwrite);
    label.appendChild(
      element('span', null, 'Replace it with the shipped version'),
    );
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
    post(ROUTE.PLAN, body())
      .then(function (data) {
        if (current !== previewToken) return;
        renderPreview(data.ruleDocs);
      })
      .catch(function (err) {
        if (current !== previewToken) return;
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
    setBusy(true);
    setStatus('info', 'Saving…');
    post(ROUTE.SAVE, body())
      .then(function (data) {
        renderPreview(data.ruleDocs);
        setStatus('ok', 'Saved. You can return to the session.');
        if (thenClose) return post(ROUTE.CLOSE, {}).then(closeWindow);
        setBusy(false);
        return undefined;
      })
      .catch(function (err) {
        setStatus('error', err.message);
        setBusy(false);
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
  renderFacts();
  refreshPreview();
})();
