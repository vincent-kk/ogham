(function () {
  'use strict';

  // Mirror src/constants/defaults.ts (DEFAULT_CONFIG) — keep in sync.
  var DEFAULT_RATIO_VALUE = 50;
  var DEFAULT_MODEL = 'auto';
  var DEFAULT_SESSION_TTL_HOURS = 72;
  var DEFAULT_SPAWN_TIMEOUT_MS = 10 * 60 * 1000;
  var DEFAULT_OPTION_FLAGS = {
    gemini: { yolo: true, sandbox: true, sandbox_backend: 'auto' },
    codex: { yolo: false, sandbox: 'workspace-write' },
  };
  var DEFAULT_ARTIFACTS = { enabled: false, location: 'project' };
  var DEFAULT_PREAMBLE = { gemini: '', codex: '' };
  var DEFAULT_RECENCY = { gemini: 'auto', codex: 'off' };

  var RATIO_MIN = 0;
  var RATIO_MAX = 100;
  var SESSION_TTL_HOURS_MIN = 1;
  var SESSION_TTL_HOURS_MAX = 720;
  var SPAWN_TIMEOUT_MS_MIN = 1000;
  var SPAWN_TIMEOUT_MS_MAX = 1800000;

  var GEMINI_BACKENDS = ['auto', 'docker', 'podman', 'sandbox-exec'];
  var CODEX_SANDBOX_MODES = [
    'read-only',
    'workspace-write',
    'danger-full-access',
    'off',
  ];
  var ARTIFACTS_LOCATIONS = ['project', 'user'];
  var RECENCY_LEVELS = ['off', 'auto', 'strict'];

  var STRENGTH_LABELS = {
    '-2': 'Subtle',
    '-1': 'Soft',
    0: 'Neutral',
    1: 'Active',
    2: 'Strong',
  };

  var params = new URLSearchParams(location.search);
  var token = params.get('token') || '';

  function $(sel) {
    return document.querySelector(sel);
  }

  var form = $('#form');
  var ratioSlider = $('#ratio-slider');
  var toggleCodex = $('#toggle-codex');
  var toggleGemini = $('#toggle-gemini');
  var geminiPct = $('#gemini-pct');
  var codexPct = $('#codex-pct');
  var codexHint = $('#codex-hint');
  var geminiHint = $('#gemini-hint');
  var codexInstallHint = $('#codex-install-hint');
  var geminiInstallHint = $('#gemini-install-hint');
  var ratioWarn = $('#ratio-warn');
  var strength = $('#strength');
  var strengthLabel = $('#strength-label');
  var kwGemini = $('#kw-gemini');
  var kwCodex = $('#kw-codex');
  var ttl = $('#ttl');
  var spawnTimeoutMs = $('#spawn-timeout-ms');
  var geminiYolo = $('#gemini-yolo');
  var geminiSandbox = $('#gemini-sandbox');
  var geminiBackendWrap = $('#gemini-backend-wrap');
  var codexYolo = $('#codex-yolo');
  var codexSandboxWrap = $('#codex-sandbox-wrap');
  var codexSandboxHint = $('#codex-sandbox-hint');
  var codexFullAccessWarning = $('#codex-full-access-warning');
  var artifactsEnabled = $('#artifacts-enabled');
  var artifactsLocationWrap = $('#artifacts-location-wrap');
  var preambleGemini = $('#preamble-gemini');
  var preambleCodex = $('#preamble-codex');
  var advancedToggleCodex = $('#advanced-toggle-codex');
  var advancedToggleGemini = $('#advanced-toggle-gemini');
  var advancedPanelCodex = $('#advanced-panel-codex');
  var advancedPanelGemini = $('#advanced-panel-gemini');
  var summaryCodex = $('#summary-codex');
  var summaryGemini = $('#summary-gemini');
  var status = $('#status');
  var saveBtn = $('#save');
  var saveCloseBtn = $('#save-close');

  var ratioState = {
    gemini: { value: DEFAULT_RATIO_VALUE, enabled: true },
    codex: { value: DEFAULT_RATIO_VALUE, enabled: true },
  };

  var providerAvailable = { codex: true, gemini: true };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function setStatus(kind, text, details) {
    status.className = 'status' + (kind ? ' ' + kind : '');
    status.innerHTML = '';
    if (!text && (!details || !details.length)) return;
    var line = document.createElement('div');
    line.textContent = text || '';
    status.appendChild(line);
    if (details && details.length) {
      var ul = document.createElement('ul');
      for (var i = 0; i < details.length; i += 1) {
        var li = document.createElement('li');
        li.textContent = String(details[i]);
        ul.appendChild(li);
      }
      status.appendChild(ul);
    }
  }

  function renderRatio() {
    var gEn = ratioState.gemini.enabled;
    var cEn = ratioState.codex.enabled;
    var gPct;
    var cPct;

    if (gEn && cEn) {
      gPct = ratioState.gemini.value;
      cPct = ratioState.codex.value;
    } else if (gEn) {
      gPct = 100;
      cPct = ratioState.codex.value;
    } else if (cEn) {
      gPct = ratioState.gemini.value;
      cPct = 100;
    } else {
      gPct = 0;
      cPct = 0;
    }

    ratioSlider.disabled = !(gEn && cEn);
    if (gEn && cEn) {
      ratioSlider.value = String(ratioState.gemini.value);
    }

    geminiPct.textContent = gEn ? gPct + '%' : 'OFF';
    codexPct.textContent = cEn ? cPct + '%' : 'OFF';

    toggleGemini.setAttribute('aria-checked', String(gEn));
    toggleCodex.setAttribute('aria-checked', String(cEn));

    toggleCodex.setAttribute(
      'data-unavailable',
      String(!providerAvailable.codex),
    );
    toggleGemini.setAttribute(
      'data-unavailable',
      String(!providerAvailable.gemini),
    );

    codexHint.textContent = providerAvailable.codex
      ? 'click to toggle'
      : 'not installed';
    geminiHint.textContent = providerAvailable.gemini
      ? 'click to toggle'
      : 'not installed';

    ratioWarn.hidden = gEn || cEn;
  }

  function onSlider() {
    if (ratioSlider.disabled) return;
    var g = clamp(
      Math.floor(Number(ratioSlider.value) || 0),
      RATIO_MIN,
      RATIO_MAX,
    );
    ratioState.gemini.value = g;
    ratioState.codex.value = RATIO_MAX - g;
    renderRatio();
  }

  function toggleProvider(name) {
    if (!providerAvailable[name]) return;
    var entry = ratioState[name];
    var other = name === 'gemini' ? ratioState.codex : ratioState.gemini;
    if (entry.enabled) {
      entry.enabled = false;
    } else {
      entry.enabled = true;
      if (entry.value <= 0) entry.value = DEFAULT_RATIO_VALUE;
      if (other.enabled) {
        other.value = clamp(RATIO_MAX - entry.value, RATIO_MIN, RATIO_MAX);
      }
    }
    renderRatio();
  }

  function updateStrengthLabel() {
    strengthLabel.textContent = STRENGTH_LABELS[strength.value] || 'Neutral';
  }

  function readProviderRatio(raw, fallback) {
    if (raw && typeof raw === 'object' && 'value' in raw) {
      return {
        value: clamp(Math.floor(Number(raw.value) || 0), RATIO_MIN, RATIO_MAX),
        enabled: Boolean(raw.enabled),
      };
    }
    if (typeof raw === 'number') {
      var n = clamp(Math.floor(raw), RATIO_MIN, RATIO_MAX);
      return { value: n, enabled: n > 0 };
    }
    return { value: fallback.value, enabled: fallback.enabled };
  }

  function setRadio(name, value, allowed) {
    var radios = document.querySelectorAll('input[name="' + name + '"]');
    var pick = allowed.indexOf(value) >= 0 ? value : allowed[0];
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].checked = radios[i].value === pick;
    }
  }

  function readRadio(name, allowed, fallback) {
    var sel = document.querySelector('input[name="' + name + '"]:checked');
    if (sel && allowed.indexOf(sel.value) >= 0) return sel.value;
    return fallback;
  }

  function syncGeminiBackendInert() {
    if (geminiSandbox.checked) {
      geminiBackendWrap.classList.remove('is-inert');
    } else {
      geminiBackendWrap.classList.add('is-inert');
    }
  }

  function syncCodexFullAccessWarning() {
    var sel = document.querySelector(
      '#codex-sandbox-radio input[type="radio"]:checked',
    );
    codexFullAccessWarning.hidden = !(
      sel && sel.value === 'danger-full-access'
    );
  }

  function syncCodexSandboxInert() {
    var inert = codexYolo.checked;
    var radios = document.querySelectorAll(
      '#codex-sandbox-radio input[type="radio"]',
    );
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].disabled = inert;
    }
    if (inert) {
      codexSandboxWrap.classList.add('is-inert');
      codexSandboxHint.hidden = false;
    } else {
      codexSandboxWrap.classList.remove('is-inert');
      codexSandboxHint.hidden = true;
    }
    syncCodexFullAccessWarning();
  }

  function syncArtifactsLocationInert() {
    if (artifactsEnabled.checked) {
      artifactsLocationWrap.classList.remove('is-inert');
    } else {
      artifactsLocationWrap.classList.add('is-inert');
    }
  }

  function toggleAdvancedPanel(toggleEl, panelEl) {
    if (toggleEl.disabled) return;
    var willOpen = toggleEl.getAttribute('aria-expanded') !== 'true';
    toggleEl.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) {
      panelEl.hidden = false;
      // Force layout so the grid-template-rows transition kicks in.
      void panelEl.offsetHeight;
      panelEl.classList.add('is-open');
      return;
    }
    panelEl.classList.remove('is-open');
    // After collapse transition completes, re-hide so the panel leaves
    // the a11y tree. transitionend may not fire when reduced motion
    // collapses the duration to ~0ms — guard with a timeout fallback.
    var finished = false;
    var done = function (ev) {
      if (finished) return;
      if (ev && ev.propertyName && ev.propertyName !== 'grid-template-rows') {
        return;
      }
      finished = true;
      panelEl.hidden = true;
      panelEl.removeEventListener('transitionend', done);
    };
    panelEl.addEventListener('transitionend', done);
    setTimeout(done, 260);
  }

  function buildSummaryChips(provider) {
    var chips = [];
    if (provider === 'codex') {
      if (codexYolo.checked) {
        chips.push({ label: 'yolo: on', tone: 'warn' });
      }
      var sb = readRadio(
        'codex-sandbox',
        CODEX_SANDBOX_MODES,
        DEFAULT_OPTION_FLAGS.codex.sandbox,
      );
      if (sb === 'danger-full-access') {
        chips.push({ label: 'sandbox: full-access', tone: 'warn' });
      } else if (sb !== 'off') {
        chips.push({ label: 'sandbox: ' + sb });
      }
      var rc = readRadio(
        'recency-codex',
        RECENCY_LEVELS,
        DEFAULT_RECENCY.codex,
      );
      if (rc !== 'off') chips.push({ label: 'rec: ' + rc });
      var kwc = (kwCodex.value || '').trim();
      if (kwc) chips.push({ label: 'keyword: on', title: kwc });
      var prc = (preambleCodex.value || '').trim();
      if (prc) chips.push({ label: 'preamble: on', title: prc.slice(0, 80) });
    } else {
      if (geminiYolo.checked) {
        chips.push({ label: 'yolo: on', tone: 'warn' });
      }
      if (geminiSandbox.checked) {
        var be = readRadio(
          'gemini-backend',
          GEMINI_BACKENDS,
          DEFAULT_OPTION_FLAGS.gemini.sandbox_backend,
        );
        chips.push({ label: 'sandbox: ' + be });
      }
      var rg = readRadio(
        'recency-gemini',
        RECENCY_LEVELS,
        DEFAULT_RECENCY.gemini,
      );
      if (rg !== 'off') chips.push({ label: 'rec: ' + rg });
      var kwg = (kwGemini.value || '').trim();
      if (kwg) chips.push({ label: 'keyword: on', title: kwg });
      var prg = (preambleGemini.value || '').trim();
      if (prg) chips.push({ label: 'preamble: on', title: prg.slice(0, 80) });
    }
    return chips;
  }

  function renderProviderSummary(provider) {
    var container = provider === 'codex' ? summaryCodex : summaryGemini;
    if (!container) return;
    var chips = buildSummaryChips(provider);
    while (container.firstChild) container.removeChild(container.firstChild);
    for (var i = 0; i < chips.length; i += 1) {
      var el = document.createElement('span');
      el.className = 'summary-chip';
      if (chips[i].tone) el.setAttribute('data-tone', chips[i].tone);
      if (chips[i].title) el.setAttribute('data-tooltip', chips[i].title);
      el.textContent = chips[i].label;
      container.appendChild(el);
    }
  }

  function renderAllSummaries() {
    renderProviderSummary('codex');
    renderProviderSummary('gemini');
  }

  function syncAdvancedToggleAvailability() {
    advancedToggleCodex.disabled = !providerAvailable.codex;
    advancedToggleGemini.disabled = !providerAvailable.gemini;
    if (
      !providerAvailable.codex &&
      advancedToggleCodex.getAttribute('aria-expanded') === 'true'
    ) {
      advancedToggleCodex.setAttribute('aria-expanded', 'false');
      advancedPanelCodex.classList.remove('is-open');
      advancedPanelCodex.hidden = true;
    }
    if (
      !providerAvailable.gemini &&
      advancedToggleGemini.getAttribute('aria-expanded') === 'true'
    ) {
      advancedToggleGemini.setAttribute('aria-expanded', 'false');
      advancedPanelGemini.classList.remove('is-open');
      advancedPanelGemini.hidden = true;
    }
  }

  function applyOptionFlags(raw) {
    var src = raw && typeof raw === 'object' ? raw : DEFAULT_OPTION_FLAGS;
    var g = src.gemini && typeof src.gemini === 'object' ? src.gemini : {};
    var c = src.codex && typeof src.codex === 'object' ? src.codex : {};
    geminiYolo.checked = Boolean(g.yolo);
    geminiSandbox.checked =
      typeof g.sandbox === 'boolean'
        ? g.sandbox
        : DEFAULT_OPTION_FLAGS.gemini.sandbox;
    setRadio(
      'gemini-backend',
      typeof g.sandbox_backend === 'string'
        ? g.sandbox_backend
        : DEFAULT_OPTION_FLAGS.gemini.sandbox_backend,
      GEMINI_BACKENDS,
    );
    codexYolo.checked = Boolean(c.yolo);
    setRadio(
      'codex-sandbox',
      typeof c.sandbox === 'string'
        ? c.sandbox
        : DEFAULT_OPTION_FLAGS.codex.sandbox,
      CODEX_SANDBOX_MODES,
    );
    syncGeminiBackendInert();
    syncCodexSandboxInert();
    syncCodexFullAccessWarning();
  }

  function applyArtifacts(raw) {
    var src = raw && typeof raw === 'object' ? raw : DEFAULT_ARTIFACTS;
    artifactsEnabled.checked = Boolean(src.enabled);
    setRadio(
      'artifacts-location',
      typeof src.location === 'string'
        ? src.location
        : DEFAULT_ARTIFACTS.location,
      ARTIFACTS_LOCATIONS,
    );
    syncArtifactsLocationInert();
  }

  function applyPreamble(raw) {
    var src = raw && typeof raw === 'object' ? raw : DEFAULT_PREAMBLE;
    preambleGemini.value =
      typeof src.gemini === 'string' ? src.gemini : DEFAULT_PREAMBLE.gemini;
    preambleCodex.value =
      typeof src.codex === 'string' ? src.codex : DEFAULT_PREAMBLE.codex;
  }

  function applyRecencyFactor(raw) {
    var src = raw && typeof raw === 'object' ? raw : DEFAULT_RECENCY;
    setRadio(
      'recency-gemini',
      typeof src.gemini === 'string' ? src.gemini : DEFAULT_RECENCY.gemini,
      RECENCY_LEVELS,
    );
    setRadio(
      'recency-codex',
      typeof src.codex === 'string' ? src.codex : DEFAULT_RECENCY.codex,
      RECENCY_LEVELS,
    );
  }

  function applyConfig(cfg) {
    var r = cfg.ratio || {};
    ratioState.gemini = readProviderRatio(r.gemini, ratioState.gemini);
    ratioState.codex = readProviderRatio(r.codex, ratioState.codex);

    strength.value = String(cfg.intervention_strength);
    kwGemini.value = cfg.keywords.gemini;
    kwCodex.value = cfg.keywords.codex;
    ttl.value = cfg.session_ttl_hours;
    spawnTimeoutMs.value = cfg.spawn_timeout_ms;
    applyOptionFlags(cfg.option_flags);
    applyArtifacts(cfg.artifacts);
    applyPreamble(cfg.preamble);
    applyRecencyFactor(cfg.recency_factor);
    var radio = document.querySelector(
      'input[name="model"][value="' + cfg.default_model + '"]',
    );
    if (radio) radio.checked = true;

    renderRatio();
    updateStrengthLabel();
    renderAllSummaries();
  }

  function buildOptionFlags() {
    return {
      gemini: {
        yolo: Boolean(geminiYolo.checked),
        sandbox: Boolean(geminiSandbox.checked),
        sandbox_backend: readRadio(
          'gemini-backend',
          GEMINI_BACKENDS,
          DEFAULT_OPTION_FLAGS.gemini.sandbox_backend,
        ),
      },
      codex: {
        yolo: Boolean(codexYolo.checked),
        sandbox: readRadio(
          'codex-sandbox',
          CODEX_SANDBOX_MODES,
          DEFAULT_OPTION_FLAGS.codex.sandbox,
        ),
      },
    };
  }

  function buildArtifacts() {
    return {
      enabled: Boolean(artifactsEnabled.checked),
      location: readRadio(
        'artifacts-location',
        ARTIFACTS_LOCATIONS,
        DEFAULT_ARTIFACTS.location,
      ),
    };
  }

  function buildPreamble() {
    return {
      gemini: String(preambleGemini.value || ''),
      codex: String(preambleCodex.value || ''),
    };
  }

  function buildRecencyFactor() {
    return {
      gemini: readRadio(
        'recency-gemini',
        RECENCY_LEVELS,
        DEFAULT_RECENCY.gemini,
      ),
      codex: readRadio('recency-codex', RECENCY_LEVELS, DEFAULT_RECENCY.codex),
    };
  }

  function buildConfig() {
    var modelEl = document.querySelector('input[name="model"]:checked');
    return {
      ratio: {
        gemini: {
          value: ratioState.gemini.value,
          enabled: ratioState.gemini.enabled,
        },
        codex: {
          value: ratioState.codex.value,
          enabled: ratioState.codex.enabled,
        },
      },
      intervention_strength: Number(strength.value),
      keywords: {
        gemini: kwGemini.value.trim(),
        codex: kwCodex.value.trim(),
      },
      default_model: modelEl ? modelEl.value : DEFAULT_MODEL,
      option_flags: buildOptionFlags(),
      session_ttl_hours: Math.max(
        SESSION_TTL_HOURS_MIN,
        Math.min(
          SESSION_TTL_HOURS_MAX,
          Math.floor(Number(ttl.value) || DEFAULT_SESSION_TTL_HOURS),
        ),
      ),
      spawn_timeout_ms: Math.max(
        SPAWN_TIMEOUT_MS_MIN,
        Math.min(
          SPAWN_TIMEOUT_MS_MAX,
          Math.floor(Number(spawnTimeoutMs.value) || DEFAULT_SPAWN_TIMEOUT_MS),
        ),
      ),
      artifacts: buildArtifacts(),
      preamble: buildPreamble(),
      recency_factor: buildRecencyFactor(),
    };
  }

  function withToken(path) {
    return path + '?token=' + encodeURIComponent(token);
  }

  function tryInlineState() {
    var raw = window.__COGAIR_STATE__;
    if (raw && typeof raw === 'object' && raw.ratio) {
      applyConfig(raw);
      return true;
    }
    return false;
  }

  async function fetchProviderStatus() {
    try {
      var res = await fetch(withToken('/provider-status'));
      if (!res.ok) return;
      var body = await res.json();
      providerAvailable.codex = Boolean(body.codex && body.codex.available);
      providerAvailable.gemini = Boolean(body.gemini && body.gemini.available);
    } catch (e) {
      // network/transient — leave defaults (both true) so the user is not locked out
      return;
    }
    if (!providerAvailable.codex) ratioState.codex.enabled = false;
    if (!providerAvailable.gemini) ratioState.gemini.enabled = false;
    codexInstallHint.hidden = providerAvailable.codex;
    geminiInstallHint.hidden = providerAvailable.gemini;
    renderRatio();
    syncAdvancedToggleAvailability();
  }

  async function loadConfig() {
    if (tryInlineState()) {
      setStatus('', '');
      await fetchProviderStatus();
      return;
    }
    setStatus('', 'Loading…');
    try {
      var res = await fetch(withToken('/config'));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var cfg = await res.json();
      applyConfig(cfg);
      setStatus('', '');
    } catch (err) {
      setStatus('error', 'Failed to load config: ' + err.message);
    }
    await fetchProviderStatus();
  }

  async function save(closeAfter) {
    if (!ratioState.gemini.enabled && !ratioState.codex.enabled) {
      setStatus('error', 'At least one provider must be enabled.');
      return;
    }
    var cfg = buildConfig();
    setStatus('', 'Saving…');
    saveBtn.disabled = saveCloseBtn.disabled = true;
    try {
      var res = await fetch(withToken('/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      var body = await res.json();
      if (!res.ok || body.success === false) {
        setStatus('error', body.message || 'Save failed', body.errors);
        return;
      }
      setStatus('success', 'Saved.');
      if (closeAfter) {
        try {
          await fetch(withToken('/close'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
        } catch (e) {
          /* server closed before responding — expected */
        }
        setStatus('success', 'Saved. Server closed.');
        return;
      }
    } catch (err) {
      setStatus('error', 'Save failed: ' + err.message);
    } finally {
      if (!closeAfter) {
        saveBtn.disabled = saveCloseBtn.disabled = false;
      }
    }
  }

  ratioSlider.addEventListener('input', onSlider);
  toggleGemini.addEventListener('click', function () {
    toggleProvider('gemini');
  });
  toggleCodex.addEventListener('click', function () {
    toggleProvider('codex');
  });
  advancedToggleCodex.addEventListener('click', function () {
    toggleAdvancedPanel(advancedToggleCodex, advancedPanelCodex);
  });
  advancedToggleGemini.addEventListener('click', function () {
    toggleAdvancedPanel(advancedToggleGemini, advancedPanelGemini);
  });
  strength.addEventListener('input', updateStrengthLabel);
  geminiSandbox.addEventListener('change', syncGeminiBackendInert);
  codexYolo.addEventListener('change', syncCodexSandboxInert);
  document
    .querySelectorAll('#codex-sandbox-radio input[type="radio"]')
    .forEach(function (r) {
      r.addEventListener('change', syncCodexFullAccessWarning);
    });
  artifactsEnabled.addEventListener('change', syncArtifactsLocationInert);
  form.addEventListener('change', renderAllSummaries);
  form.addEventListener('input', renderAllSummaries);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    save(false);
  });
  saveCloseBtn.addEventListener('click', function () {
    save(true);
  });

  renderAllSummaries();
  loadConfig();
})();
