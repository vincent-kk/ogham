(function () {
  'use strict';

  // Mirror src/constants/defaults.ts (DEFAULT_CONFIG) — keep in sync.
  var DEFAULT_RATIO = {
    codex: { value: 34, enabled: true },
    antigravity: { value: 33, enabled: true },
    claude: { value: 33, enabled: true },
  };
  var DEFAULT_SESSION_TTL_HOURS = 72;
  var DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
  var DEFAULT_HARD_CAP_MS = {
    apex: 6 * 60 * 60 * 1000,
    high: 2 * 60 * 60 * 1000,
    mid: 60 * 60 * 1000,
    low: 30 * 60 * 1000,
  };
  var MINUTE_MS = 60 * 1000;
  var DEFAULT_OPTION_FLAGS = {
    codex: { yolo: false, sandbox: 'workspace-write' },
    // headless agy auto-denies permission-gated tools; skip to let them run,
    // sandboxed so auto-approval stays inside terminal restrictions (paired)
    antigravity: { sandbox: true, skip_permissions: true },
    claude: { permission_mode: 'dontAsk' },
  };
  var DEFAULT_ARTIFACTS = { enabled: false, location: 'project' };
  var DEFAULT_PREAMBLE = { codex: '', antigravity: '', claude: '' };
  var DEFAULT_RECENCY = { codex: 'off', antigravity: 'auto', claude: 'off' };
  var DEFAULT_DEFAULT_TIER = {
    codex: 'mid',
    antigravity: 'mid',
    claude: 'mid',
  };
  var DEFAULT_CLAUDE_MODEL_MAP = {
    apex: { model: 'opus[1m]', effort: 'ultracode' },
    high: { model: 'opus', effort: 'max' },
    mid: { model: 'opus', effort: 'high' },
    low: { model: 'sonnet', effort: 'high' },
  };
  var DEFAULT_CODEX_MODEL_MAP = {
    apex: { model: 'gpt-5.6-sol', effort: 'ultra' },
    high: { model: 'gpt-5.6-sol', effort: 'max' },
    mid: { model: 'gpt-5.6-terra', effort: 'high' },
    low: { model: 'gpt-5.6-terra', effort: 'medium' },
  };
  var DEFAULT_ANTIGRAVITY_MODEL_MAP = {
    apex: { model: 'Gemini 3.1 Pro', effort: 'High' },
    high: { model: 'Gemini 3.1 Pro', effort: 'Low' },
    mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
    low: { model: 'Gemini 3.5 Flash', effort: 'Low' },
  };
  var DEFAULT_YOUTUBE_ADDON = {
    enabled: false,
    language: 'en',
    targets: { claude: false, codex: true, antigravity: true },
  };

  var RATIO_MIN = 0;
  var RATIO_MAX = 100;
  var SESSION_TTL_HOURS_MIN = 1;
  var SESSION_TTL_HOURS_MAX = 720;
  // Both limits are entered in minutes; the ceiling reaches a full day so an
  // agentic apex run is never cut short by the form's own bounds.
  var TIMEOUT_MIN_MINUTES = 1;
  var IDLE_MAX_MINUTES = 120;
  var HARD_CAP_MAX_MINUTES = 1440;

  // Screen order, not an arbitrary list: the ratio bar divides providers in this
  // order, so it has to match the order the provider cards appear in index.html
  // (a settingsPage spec pins the two together).
  var PROVIDERS = ['claude', 'codex', 'antigravity'];
  var CODEX_SANDBOX_MODES = [
    'read-only',
    'workspace-write',
    'danger-full-access',
    'off',
  ];
  var CLAUDE_PERMISSION_MODES = [
    'acceptEdits',
    'auto',
    'dontAsk',
    'bypassPermissions',
  ];
  // Mirror src/constants/claudeModels.ts — keep in sync.
  var CLAUDE_MODEL_ALIASES = [
    'opus',
    'sonnet',
    'haiku',
    'fable',
    'best',
    'opus[1m]',
    'sonnet[1m]',
  ];
  // `ultracode` tops the scale — a mode (multi-agent orchestration), not a depth.
  // This list and the sets below are the only guard: claude-code takes any level
  // for any model and silently skips one the model cannot honour.
  var CLAUDE_EFFORT_LEVELS = [
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'ultracode',
  ];
  var MODEL_EFFORT_SETS = {
    opus: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
    'opus[1m]': ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
    fable: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
    best: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
    sonnet: ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
    'sonnet[1m]': ['low', 'medium', 'high', 'xhigh', 'max', 'ultracode'],
    haiku: [],
  };
  // Mirror src/constants/codexModels.ts — keep in sync. The live catalog from
  // /provider-status wins; these sets only cover a codex that cannot be probed.
  var CODEX_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
  // agy variants are model-specific labels, not a shared scale; this ordering only
  // guides clampEffort's fallback when a model switch drops the current variant.
  var AGY_EFFORT_SCALE = ['Low', 'Medium', 'High', 'Thinking'];
  // Mirror src/constants/agyModels.ts — keep in sync (a settingsPage spec pins it).
  var AGY_VARIANT_SUFFIXES = ['high', 'medium', 'low', 'thinking'];
  var CODEX_FALLBACK_MODEL_EFFORT_SETS = {
    'gpt-5.6-sol': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    'gpt-5.6-terra': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    'gpt-5.6-luna': ['low', 'medium', 'high', 'xhigh', 'max'],
    'gpt-5.5': ['low', 'medium', 'high', 'xhigh'],
    'gpt-5.4': ['low', 'medium', 'high', 'xhigh'],
    'gpt-5.4-mini': ['low', 'medium', 'high', 'xhigh'],
  };
  var ARTIFACTS_LOCATIONS = ['project', 'user'];
  var RECENCY_LEVELS = ['off', 'auto', 'strict'];
  var TIERS = ['apex', 'high', 'mid', 'low'];
  var YOUTUBE_LANGUAGES = ['en', 'ko'];

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

  // Every per-tier control is `<prefix>-<tier>`, so the tier list is the only
  // place a new tier has to be declared.
  function tierSelects(prefix) {
    var map = {};
    TIERS.forEach(function (tier) {
      map[tier] = $('#' + prefix + '-' + tier);
    });
    return map;
  }

  var form = $('#form');
  var status = $('#status');
  var saveBtn = $('#save');
  var saveCloseBtn = $('#save-close');
  var cancelBtn = $('#cancel');
  var ratioWarn = $('#ratio-warn');
  var ratioBar = $('#ratio-bar');
  var ratioBarTrack = $('#ratio-bar-track');
  var strength = $('#strength');
  var strengthLabel = $('#strength-label');
  var ttl = $('#ttl');
  var idleTimeoutMin = $('#idle-timeout-min');
  var limitsSummary = $('#limits-summary');
  var hardCapInputs = tierSelects('hard-cap');

  // Per-provider element groups.
  var refs = {};
  PROVIDERS.forEach(function (p) {
    refs[p] = {
      toggle: $('#toggle-' + p),
      pct: $('#' + p + '-pct'),
      hint: $('#' + p + '-hint'),
      summary: $('#summary-' + p),
      installHint: $('#' + p + '-install-hint'),
      advancedToggle: $('#advanced-toggle-' + p),
      advancedPanel: $('#advanced-panel-' + p),
      kw: $('#kw-' + p),
      crosscheckOnly: $('#crosscheck-only-' + p),
      preamble: $('#preamble-' + p),
    };
  });

  // codex-specific flag controls.
  var codexYolo = $('#codex-yolo');
  var codexSandboxWrap = $('#codex-sandbox-wrap');
  var codexSandboxHint = $('#codex-sandbox-hint');
  var codexFullAccessWarning = $('#codex-full-access-warning');
  var modelCodex = tierSelects('model-codex');
  var effortCodex = tierSelects('effort-codex');

  // antigravity-specific controls.
  var antigravitySandbox = $('#antigravity-sandbox');
  var antigravitySkipPerms = $('#antigravity-skip-perms');
  var modelAntigravity = tierSelects('model-antigravity');
  var effortAntigravity = tierSelects('effort-antigravity');

  // claude-specific controls.
  var claudeBypassWarning = $('#claude-bypass-warning');
  var modelClaude = tierSelects('model-claude');
  var effortClaude = tierSelects('effort-claude');

  // Artifacts + youtube controls.
  var artifactsEnabled = $('#artifacts-enabled');
  var artifactsLocationWrap = $('#artifacts-location-wrap');
  var youtubeEnabled = $('#youtube-enabled');
  var youtubeDetailWrap = $('#youtube-detail-wrap');
  var youtubeTargetClaude = $('#youtube-target-claude');
  var youtubeTargetCodex = $('#youtube-target-codex');
  var youtubeTargetAntigravity = $('#youtube-target-antigravity');
  var youtubeAdvancedToggle = $('#youtube-advanced-toggle');
  var youtubeAdvancedPanel = $('#youtube-advanced-panel');

  // crosscheck_only keeps a provider usable by crosscheck and by name while
  // taking it out of the hooks' own routing.
  var ratioState = {
    codex: {
      value: DEFAULT_RATIO.codex.value,
      enabled: DEFAULT_RATIO.codex.enabled,
      crosscheck_only: false,
    },
    antigravity: {
      value: DEFAULT_RATIO.antigravity.value,
      enabled: DEFAULT_RATIO.antigravity.enabled,
      crosscheck_only: false,
    },
    claude: {
      value: DEFAULT_RATIO.claude.value,
      enabled: DEFAULT_RATIO.claude.enabled,
      crosscheck_only: false,
    },
  };
  var providerStatus = {
    codex: 'available',
    antigravity: 'available',
    claude: 'available',
  };
  var agyModels = [];
  var codexModels = [];
  var antigravityModelMap = {
    high: { model: '', effort: '' },
    mid: { model: '', effort: '' },
    low: { model: '', effort: '' },
  };
  var claudeModelMap = {
    high: { model: '', effort: '' },
    mid: { model: '', effort: '' },
    low: { model: '', effort: '' },
  };
  var codexModelMap = {
    high: { model: '', effort: '' },
    mid: { model: '', effort: '' },
    low: { model: '', effort: '' },
  };

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

  // Providers the ratio bar divides: enabled minus the crosscheck-only ones.
  // A crosscheck-only provider keeps its stored percent untouched — it simply
  // stops taking part in the 100% split, which the rest recompute among
  // themselves.
  function routableProviders() {
    return PROVIDERS.filter(function (p) {
      return ratioState[p].enabled && !ratioState[p].crosscheck_only;
    });
  }

  function enabledCount() {
    return PROVIDERS.filter(function (p) {
      return ratioState[p].enabled;
    }).length;
  }

  function distributeEvenly() {
    var active = routableProviders();
    if (active.length === 0) return;
    var base = Math.floor(RATIO_MAX / active.length);
    var remainder = RATIO_MAX - base * active.length;
    active.forEach(function (p, index) {
      ratioState[p].value = base + (index < remainder ? 1 : 0);
    });
  }

  function normalizeEnabledRatios() {
    var active = routableProviders();
    if (active.length === 0) return;
    var total = active.reduce(function (sum, p) {
      return sum + ratioState[p].value;
    }, 0);
    if (total <= 0) {
      distributeEvenly();
      return;
    }
    var assigned = 0;
    var scaled = active.map(function (p, index) {
      var exact = (ratioState[p].value / total) * RATIO_MAX;
      var value = Math.floor(exact);
      assigned += value;
      return {
        provider: p,
        value: value,
        remainder: exact - value,
        index: index,
      };
    });
    scaled
      .slice()
      .sort(function (a, b) {
        if (b.remainder !== a.remainder) return b.remainder - a.remainder;
        return a.index - b.index;
      })
      .slice(0, RATIO_MAX - assigned)
      .forEach(function (item) {
        item.value += 1;
      });
    scaled.forEach(function (item) {
      ratioState[item.provider].value = item.value;
    });
  }

  function ratioBoundaries(active) {
    var boundaries = [];
    var left = 0;
    for (var i = 0; i < active.length - 1; i += 1) {
      left += ratioState[active[i]].value;
      boundaries.push(left);
    }
    return boundaries;
  }

  // Segments go inside the clipping track, handles above it. Keeping the two out
  // of one parent is what makes the segment corners independent of how many
  // handles exist — the track's own radius shapes whatever it contains.
  function clearRatioBar() {
    while (ratioBarTrack.firstChild)
      ratioBarTrack.removeChild(ratioBarTrack.firstChild);
    var handles = ratioBar.querySelectorAll('.ratio-bar-handle');
    for (var i = 0; i < handles.length; i += 1)
      ratioBar.removeChild(handles[i]);
  }

  function renderRatioSegments(active) {
    var left = 0;
    active.forEach(function (p, index) {
      var segment = document.createElement('div');
      segment.className = 'ratio-bar-segment';
      segment.setAttribute('data-provider', p);
      segment.setAttribute('data-rank', String(index));
      segment.style.left = left + '%';
      segment.style.width = ratioState[p].value + '%';
      ratioBarTrack.appendChild(segment);
      left += ratioState[p].value;
    });
  }

  function renderRatioHandles(active) {
    var boundaries = ratioBoundaries(active);
    boundaries.forEach(function (boundary, index) {
      var leftProvider = active[index];
      var rightProvider = active[index + 1];
      var handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'ratio-bar-handle';
      handle.style.left = boundary + '%';
      handle.setAttribute('data-boundary-index', String(index));
      handle.setAttribute(
        'aria-label',
        leftProvider + ' / ' + rightProvider + ' ratio',
      );
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      handle.setAttribute('aria-valuenow', String(boundary));
      handle.setAttribute('role', 'slider');
      ratioBar.appendChild(handle);
    });
  }

  function renderRatio() {
    normalizeEnabledRatios();
    var active = routableProviders();
    PROVIDERS.forEach(function (p) {
      var st = ratioState[p];
      var el = refs[p];
      // A crosscheck-only provider keeps its stored percent but shows none:
      // it is outside the 100% split, so printing it would imply a total over 100.
      el.pct.textContent = !st.enabled
        ? 'OFF'
        : st.crosscheck_only
          ? ''
          : st.value + '%';
      el.toggle.setAttribute('aria-checked', String(st.enabled));
      el.crosscheckOnly.checked = Boolean(st.crosscheck_only);
      // Keywords only feed auto-routing, so they have nothing to drive here.
      el.kw.disabled = Boolean(st.crosscheck_only);
      var statusValue = providerStatus[p];
      el.toggle.setAttribute(
        'data-unavailable',
        String(statusValue === 'unavailable'),
      );
      el.toggle.setAttribute('data-provider-status', statusValue);
      el.hint.textContent =
        statusValue === 'available'
          ? st.enabled && st.crosscheck_only
            ? 'crosscheck only'
            : 'click to toggle'
          : statusValue === 'unavailable'
            ? st.enabled
              ? 'enabled · not installed'
              : 'not installed'
            : st.enabled
              ? 'enabled · status unknown'
              : 'status check failed';
    });
    clearRatioBar();
    renderRatioSegments(active);
    renderRatioHandles(active);
    if (enabledCount() === 0) {
      ratioWarn.textContent = 'At least one provider must be enabled.';
      ratioWarn.hidden = false;
    } else if (active.length === 0) {
      ratioWarn.textContent =
        'Every enabled provider is crosscheck-only — nothing is auto-routed.';
      ratioWarn.hidden = false;
    } else ratioWarn.hidden = true;
  }

  function setRatioBoundary(index, percent) {
    var active = routableProviders();
    var boundaries = ratioBoundaries(active);
    if (index < 0 || index >= boundaries.length) return;
    var min = index === 0 ? RATIO_MIN + 1 : boundaries[index - 1] + 1;
    var max =
      index === boundaries.length - 1
        ? RATIO_MAX - 1
        : boundaries[index + 1] - 1;
    boundaries[index] = clamp(Math.round(percent), min, max);
    var previous = 0;
    active.forEach(function (p, i) {
      var next = i < boundaries.length ? boundaries[i] : RATIO_MAX;
      ratioState[p].value = next - previous;
      previous = next;
    });
    renderRatio();
  }

  function ratioPercentFromPointer(ev) {
    var rect = ratioBar.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return ((ev.clientX - rect.left) / rect.width) * RATIO_MAX;
  }

  var draggingBoundary = null;

  function onRatioPointerMove(ev) {
    if (draggingBoundary === null) return;
    setRatioBoundary(draggingBoundary, ratioPercentFromPointer(ev));
  }

  function onRatioPointerUp() {
    draggingBoundary = null;
    window.removeEventListener('pointermove', onRatioPointerMove);
    window.removeEventListener('pointerup', onRatioPointerUp);
  }

  function onRatioPointerDown(ev) {
    if (
      !ev.target.classList ||
      !ev.target.classList.contains('ratio-bar-handle')
    )
      return;
    draggingBoundary = Number(ev.target.getAttribute('data-boundary-index'));
    if (ev.target.setPointerCapture) ev.target.setPointerCapture(ev.pointerId);
    window.addEventListener('pointermove', onRatioPointerMove);
    window.addEventListener('pointerup', onRatioPointerUp);
    onRatioPointerMove(ev);
  }

  function onRatioKeydown(ev) {
    if (
      !ev.target.classList ||
      !ev.target.classList.contains('ratio-bar-handle')
    )
      return;
    var index = Number(ev.target.getAttribute('data-boundary-index'));
    var current = ratioBoundaries(routableProviders())[index];
    var step = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      setRatioBoundary(index, current - step);
    } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      setRatioBoundary(index, current + step);
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      setRatioBoundary(index, RATIO_MIN);
    } else if (ev.key === 'End') {
      ev.preventDefault();
      setRatioBoundary(index, RATIO_MAX);
    }
  }

  function toggleProvider(p) {
    var st = ratioState[p];
    if (st.enabled) {
      st.enabled = false;
    } else {
      if (providerStatus[p] !== 'available') return;
      st.enabled = true;
    }
    distributeEvenly();
    renderRatio();
    syncAdvancedToggleAvailability();
    renderAllSummaries();
  }

  function updateStrengthLabel() {
    strengthLabel.textContent = STRENGTH_LABELS[strength.value] || 'Neutral';
  }

  function readProviderRatio(raw, fallback) {
    if (raw && typeof raw === 'object' && 'value' in raw) {
      return {
        value: clamp(Math.floor(Number(raw.value) || 0), RATIO_MIN, RATIO_MAX),
        enabled: Boolean(raw.enabled),
        crosscheck_only: Boolean(raw.crosscheck_only),
      };
    }
    if (typeof raw === 'number') {
      var n = clamp(Math.floor(raw), RATIO_MIN, RATIO_MAX);
      return { value: n, enabled: n > 0, crosscheck_only: false };
    }
    return {
      value: fallback.value,
      enabled: fallback.enabled,
      crosscheck_only: Boolean(fallback.crosscheck_only),
    };
  }

  function setRadio(name, value, allowed, fallback) {
    var radios = document.querySelectorAll('input[name="' + name + '"]');
    var pick =
      allowed.indexOf(value) >= 0
        ? value
        : allowed.indexOf(fallback) >= 0
          ? fallback
          : allowed[0];
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].checked = radios[i].value === pick;
    }
  }

  function readRadio(name, allowed, fallback) {
    var sel = document.querySelector('input[name="' + name + '"]:checked');
    if (sel && allowed.indexOf(sel.value) >= 0) return sel.value;
    return fallback;
  }

  function updateInstallHints() {
    PROVIDERS.forEach(function (p) {
      refs[p].installHint.hidden = providerStatus[p] !== 'unavailable';
    });
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
    for (var i = 0; i < radios.length; i += 1) radios[i].disabled = inert;
    if (inert) {
      codexSandboxWrap.classList.add('is-inert');
      codexSandboxHint.hidden = false;
    } else {
      codexSandboxWrap.classList.remove('is-inert');
      codexSandboxHint.hidden = true;
    }
    syncCodexFullAccessWarning();
  }

  function syncClaudeBypassWarning() {
    var mode = readRadio(
      'claude-permission-mode',
      CLAUDE_PERMISSION_MODES,
      DEFAULT_OPTION_FLAGS.claude.permission_mode,
    );
    claudeBypassWarning.hidden = mode !== 'bypassPermissions';
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
      void panelEl.offsetHeight;
      panelEl.classList.add('is-open');
      return;
    }
    panelEl.classList.remove('is-open');
    var finished = false;
    var done = function (ev) {
      if (finished) return;
      if (ev && ev.propertyName && ev.propertyName !== 'grid-template-rows')
        return;
      finished = true;
      panelEl.hidden = true;
      panelEl.removeEventListener('transitionend', done);
    };
    panelEl.addEventListener('transitionend', done);
    setTimeout(done, 260);
  }

  function buildSummaryChips(provider) {
    var chips = [];
    var rc = readRadio(
      'recency-' + provider,
      RECENCY_LEVELS,
      DEFAULT_RECENCY[provider],
    );
    if (provider === 'codex') {
      if (codexYolo.checked) chips.push({ label: 'yolo: on', tone: 'warn' });
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
    } else if (provider === 'antigravity') {
      if (antigravitySkipPerms.checked) {
        chips.push({ label: 'skip-perms: on', tone: 'warn' });
      }
    } else if (provider === 'claude') {
      var mode = readRadio(
        'claude-permission-mode',
        CLAUDE_PERMISSION_MODES,
        DEFAULT_OPTION_FLAGS.claude.permission_mode,
      );
      chips.push(
        mode === 'bypassPermissions'
          ? { label: 'perm: bypass', tone: 'warn' }
          : { label: 'perm: ' + mode },
      );
    }
    if (rc !== 'off') chips.push({ label: 'rec: ' + rc });
    var kw = (refs[provider].kw.value || '').trim();
    if (kw) chips.push({ label: 'keyword: on', title: kw });
    var pre = (refs[provider].preamble.value || '').trim();
    if (pre) chips.push({ label: 'preamble: on', title: pre.slice(0, 80) });
    return chips;
  }

  function renderProviderSummary(provider) {
    var container = refs[provider].summary;
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
    PROVIDERS.forEach(renderProviderSummary);
  }

  function syncAdvancedToggleAvailability() {
    PROVIDERS.forEach(function (p) {
      var el = refs[p];
      el.advancedToggle.disabled = providerStatus[p] !== 'available';
      if (
        providerStatus[p] !== 'available' &&
        el.advancedToggle.getAttribute('aria-expanded') === 'true'
      ) {
        el.advancedToggle.setAttribute('aria-expanded', 'false');
        el.advancedPanel.classList.remove('is-open');
        el.advancedPanel.hidden = true;
      }
    });
  }

  function applyOptionFlags(raw) {
    var src = raw && typeof raw === 'object' ? raw : DEFAULT_OPTION_FLAGS;
    var c = src.codex && typeof src.codex === 'object' ? src.codex : {};
    var a =
      src.antigravity && typeof src.antigravity === 'object'
        ? src.antigravity
        : {};
    var cl = src.claude && typeof src.claude === 'object' ? src.claude : {};
    codexYolo.checked = Boolean(c.yolo);
    setRadio(
      'codex-sandbox',
      typeof c.sandbox === 'string'
        ? c.sandbox
        : DEFAULT_OPTION_FLAGS.codex.sandbox,
      CODEX_SANDBOX_MODES,
    );
    antigravitySandbox.checked = Boolean(a.sandbox);
    antigravitySkipPerms.checked = Boolean(a.skip_permissions);
    setRadio(
      'claude-permission-mode',
      typeof cl.permission_mode === 'string'
        ? cl.permission_mode
        : DEFAULT_OPTION_FLAGS.claude.permission_mode,
      CLAUDE_PERMISSION_MODES,
      DEFAULT_OPTION_FLAGS.claude.permission_mode,
    );
    syncCodexSandboxInert();
    syncCodexFullAccessWarning();
    syncClaudeBypassWarning();
  }

  // Config stores milliseconds; the form takes minutes. Both directions convert
  // here so no other code carries the factor.
  // Never renders 0: the inputs start at 1 minute, so a sub-minute value written by
  // hand would show as 0 and save back as the default, losing the setting silently.
  // Showing 1 is still a rewrite, but a visible one.
  function minutesFromMs(raw, fallbackMs) {
    var ms = Number(raw);
    return Math.max(1, Math.round((ms > 0 ? ms : fallbackMs) / MINUTE_MS));
  }

  function msFromMinutes(raw, fallbackMs, maxMinutes) {
    var minutes = Math.floor(Number(raw));
    if (!(minutes >= TIMEOUT_MIN_MINUTES)) return fallbackMs;
    return Math.min(minutes, maxMinutes) * MINUTE_MS;
  }

  // Minutes read badly past an hour, and the panel is collapsed by default — the
  // summary is the only place most users ever see these values.
  function humanMinutes(minutes) {
    var value = Number(minutes) || 0;
    if (value < 60) return value + ' min';
    var hours = value / 60;
    return (Number.isInteger(hours) ? hours : hours.toFixed(1)) + ' h';
  }

  function renderTimeoutSummary() {
    var ceilings = TIERS.map(function (tier) {
      return humanMinutes(hardCapInputs[tier].value);
    });
    limitsSummary.textContent =
      'idle ' +
      humanMinutes(idleTimeoutMin.value) +
      ' · ceilings ' +
      ceilings.join(' / ');
  }

  function applyTimeouts(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var caps =
      src.hard_cap_ms && typeof src.hard_cap_ms === 'object'
        ? src.hard_cap_ms
        : {};
    idleTimeoutMin.value = minutesFromMs(src.idle_ms, DEFAULT_IDLE_TIMEOUT_MS);
    TIERS.forEach(function (tier) {
      hardCapInputs[tier].value = minutesFromMs(
        caps[tier],
        DEFAULT_HARD_CAP_MS[tier],
      );
    });
    renderTimeoutSummary();
  }

  function buildTimeouts() {
    var caps = {};
    TIERS.forEach(function (tier) {
      caps[tier] = msFromMinutes(
        hardCapInputs[tier].value,
        DEFAULT_HARD_CAP_MS[tier],
        HARD_CAP_MAX_MINUTES,
      );
    });
    return {
      idle_ms: msFromMinutes(
        idleTimeoutMin.value,
        DEFAULT_IDLE_TIMEOUT_MS,
        IDLE_MAX_MINUTES,
      ),
      hard_cap_ms: caps,
    };
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

  function applyStringMap(raw, defaults, apply) {
    var src = raw && typeof raw === 'object' ? raw : defaults;
    PROVIDERS.forEach(function (p) {
      apply(p, typeof src[p] === 'string' ? src[p] : defaults[p]);
    });
  }

  function applyPreamble(raw) {
    applyStringMap(raw, DEFAULT_PREAMBLE, function (p, v) {
      refs[p].preamble.value = v;
    });
  }

  function applyRecencyFactor(raw) {
    applyStringMap(raw, DEFAULT_RECENCY, function (p, v) {
      setRadio('recency-' + p, v, RECENCY_LEVELS);
    });
  }

  function applyDefaultTier(raw) {
    applyStringMap(raw, DEFAULT_DEFAULT_TIER, function (p, v) {
      setRadio('default-tier-' + p, v, TIERS);
    });
  }

  function applyKeywords(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    PROVIDERS.forEach(function (p) {
      refs[p].kw.value = typeof src[p] === 'string' ? src[p] : '';
    });
  }

  function bindSelectOptions(sel, values, current, emptyText) {
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var list = values.slice();
    if (current && list.indexOf(current) < 0) list.unshift(current);
    if (list.length === 0) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = emptyText;
      sel.appendChild(empty);
      return;
    }
    for (var i = 0; i < list.length; i += 1) {
      var opt = document.createElement('option');
      opt.value = list[i];
      opt.textContent = list[i];
      if (list[i] === current) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  // agy models arrive as full display names — "Gemini 3.5 Flash (Medium)". Split the
  // trailing "(variant)" into model + effort so the UI can offer a model dropdown and a
  // per-model effort dropdown, mirroring codex/claude. dispatch recomposes them back
  // into this form since agy carries the variant inside the model name.
  // agy spells a model two ways and both carry the variant: a display name puts it
  // in parentheses ("Gemini 3.6 Flash (High)"), the catalog slug appends it
  // ("gemini-3.6-flash-high"). Splitting both keeps the form's two axes — model and
  // effort — meaningful; without this every slug lands whole in the model dropdown
  // and every effort select reads "(no effort)". A tail that is not a known variant
  // (the version in `claude-sonnet-4-6`) stays part of the base.
  // Mirrors AGY_VARIANT_SUFFIXES in src/constants/agyModels.ts.
  // Both spellings return the variant as AGY_EFFORT_SCALE spells it: the effort
  // axis, the value saved to config and clampEffort's ranking all compare as plain
  // strings, so a lowercase slug variant would match nothing in the scale and every
  // model switch would fall to the catalog's last variant. joinAgyName lowercases
  // again when it rebuilds a slug, so what agy receives is unchanged.
  function canonicalAgyVariant(variant) {
    var text = String(variant || '').trim();
    for (var i = 0; i < AGY_EFFORT_SCALE.length; i += 1)
      if (AGY_EFFORT_SCALE[i].toLowerCase() === text.toLowerCase())
        return AGY_EFFORT_SCALE[i];
    return text;
  }

  function parseAgyModel(fullName) {
    var name = String(fullName || '').trim();
    var match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(name);
    if (match)
      return { model: match[1].trim(), effort: canonicalAgyVariant(match[2]) };
    if (name.indexOf(' ') === -1)
      for (var i = 0; i < AGY_VARIANT_SUFFIXES.length; i += 1) {
        var suffix = '-' + AGY_VARIANT_SUFFIXES[i];
        if (
          name.length > suffix.length &&
          name.slice(-suffix.length) === suffix
        )
          return {
            model: name.slice(0, name.length - suffix.length),
            effort: canonicalAgyVariant(AGY_VARIANT_SUFFIXES[i]),
          };
      }
    return { model: name, effort: '' };
  }

  function agyModelBases() {
    var bases = [];
    for (var i = 0; i < agyModels.length; i += 1) {
      var base = parseAgyModel(agyModels[i]).model;
      if (base && bases.indexOf(base) < 0) bases.push(base);
    }
    return bases;
  }

  function agyEffortSet(base) {
    var set = [];
    for (var i = 0; i < agyModels.length; i += 1) {
      var parsed = parseAgyModel(agyModels[i]);
      if (
        parsed.model === base &&
        parsed.effort &&
        set.indexOf(parsed.effort) < 0
      )
        set.push(parsed.effort);
    }
    return set;
  }

  function bindAgyEffortOptions(tier, base) {
    var sel = effortAntigravity[tier];
    if (!sel) return;
    var set = agyEffortSet(base);
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    if (set.length === 0) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '(no effort)';
      sel.appendChild(empty);
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    var pick = clampEffort(
      antigravityModelMap[tier].effort,
      set,
      AGY_EFFORT_SCALE,
    );
    for (var i = 0; i < set.length; i += 1) {
      var opt = document.createElement('option');
      opt.value = set[i];
      opt.textContent = set[i];
      if (set[i] === pick) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function bindAgyModelOptions() {
    var bases = agyModelBases();
    TIERS.forEach(function (tier) {
      var sel = modelAntigravity[tier];
      if (!sel) return;
      bindSelectOptions(
        sel,
        bases,
        antigravityModelMap[tier].model,
        '(run agy to load models)',
      );
      bindAgyEffortOptions(tier, sel.value);
    });
  }

  // Config stores the name agy would accept on its own. A bare base is not one —
  // agy answers "--model gemini-3.6-flash requires --effort" — and the settings
  // page is served from disk while the MCP server only reloads on restart, so a
  // base written here can reach a dispatcher from an older build that sends it
  // unchanged. Joining on save keeps the stored value valid for either build.
  // Mirrors joinName in dispatcher/antigravity/operations/modelAlias.ts.
  function joinAgyName(model, effort) {
    var name = String(model || '').trim();
    var variant = String(effort || '').trim();
    if (!variant || parseAgyModel(name).effort) return name;
    return name.indexOf(' ') !== -1
      ? name + ' (' + variant + ')'
      : name + '-' + variant.toLowerCase();
  }

  // The effort select is disabled for two different reasons, and they call for
  // opposite handling: the catalog could not be read (keep the stored effort — it
  // is still the user's setting), or this model genuinely has no variants (drop it,
  // or dispatch would rebuild "<model>-high" and agy would reject the name).
  function keptAgyEffort(tier, base) {
    var stored = antigravityModelMap[tier].effort;
    if (agyModels.length === 0) return stored;
    // A base the catalog does not list says nothing about its variants — a config
    // written in display form ("Gemini 3.1 Pro") never matches a slug catalog, and
    // dropping its effort would collapse apex and high onto the same incomplete
    // name. Only a base the catalog DOES list, with no variants, loses its effort.
    if (agyModelBases().indexOf(base) < 0) return stored;
    return agyEffortSet(base).length > 0 ? stored : '';
  }

  function onAgyModelChange(tier) {
    var sel = effortAntigravity[tier];
    var model = modelAntigravity[tier].value;
    antigravityModelMap[tier].effort =
      sel && !sel.disabled ? sel.value : keptAgyEffort(tier, model);
    bindAgyEffortOptions(tier, model);
    renderProviderSummary('antigravity');
  }

  // Keep the closest level at or below the current one when a model switch shrinks
  // the available set. `scale` orders the provider's levels (codex adds ultra).
  function clampEffort(current, set, scale) {
    if (set.length === 0) return '';
    if (set.indexOf(current) >= 0) return current;
    var rank = scale.indexOf(current);
    if (rank < 0) return set[set.length - 1];
    var best = set[0];
    for (var i = 0; i < set.length; i += 1) {
      if (scale.indexOf(set[i]) <= rank) best = set[i];
    }
    return best;
  }

  function bindClaudeEffortOptions(tier, model) {
    var sel = effortClaude[tier];
    if (!sel) return;
    var set = MODEL_EFFORT_SETS[model] || [];
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    if (set.length === 0) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(no effort)';
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    var pick = clampEffort(
      claudeModelMap[tier].effort,
      set,
      CLAUDE_EFFORT_LEVELS,
    );
    for (var i = 0; i < set.length; i += 1) {
      var o = document.createElement('option');
      o.value = set[i];
      o.textContent = set[i];
      if (set[i] === pick) o.selected = true;
      sel.appendChild(o);
    }
  }

  function bindClaudeModelOptions() {
    TIERS.forEach(function (tier) {
      var sel = modelClaude[tier];
      if (!sel) return;
      bindSelectOptions(
        sel,
        CLAUDE_MODEL_ALIASES,
        claudeModelMap[tier].model,
        '(none)',
      );
      bindClaudeEffortOptions(tier, sel.value);
    });
  }

  function onClaudeModelChange(tier) {
    // Preserve the currently chosen effort across the rebuild so a same-family
    // model switch keeps the user's effort when still valid.
    var sel = effortClaude[tier];
    claudeModelMap[tier].effort =
      sel && !sel.disabled ? sel.value : claudeModelMap[tier].effort;
    bindClaudeEffortOptions(tier, modelClaude[tier].value);
    renderProviderSummary('claude');
  }

  function codexCatalogEntry(slug) {
    for (var i = 0; i < codexModels.length; i += 1) {
      if (codexModels[i] && codexModels[i].slug === slug) return codexModels[i];
    }
    return null;
  }

  // An unknown model (custom slug, or a catalog newer than this build) gets the
  // full scale rather than an empty selector — codex itself is the final arbiter.
  function codexEffortSet(slug) {
    var entry = codexCatalogEntry(slug);
    if (entry && Array.isArray(entry.efforts)) return entry.efforts;
    return CODEX_FALLBACK_MODEL_EFFORT_SETS[slug] || CODEX_EFFORT_LEVELS;
  }

  function codexModelSlugs() {
    if (codexModels.length > 0) {
      return codexModels
        .map(function (m) {
          return m && typeof m.slug === 'string' ? m.slug : '';
        })
        .filter(function (slug) {
          return slug.length > 0;
        });
    }
    return Object.keys(CODEX_FALLBACK_MODEL_EFFORT_SETS);
  }

  function applyCodexModelTitles(sel) {
    for (var i = 0; i < sel.options.length; i += 1) {
      var entry = codexCatalogEntry(sel.options[i].value);
      if (entry && entry.description) sel.options[i].title = entry.description;
    }
    var current = codexCatalogEntry(sel.value);
    sel.title = current && current.description ? current.description : '';
  }

  function bindCodexEffortOptions(tier, model) {
    var sel = effortCodex[tier];
    if (!sel) return;
    var set = codexEffortSet(model);
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    if (set.length === 0) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '(no effort)';
      sel.appendChild(empty);
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    var pick = clampEffort(
      codexModelMap[tier].effort,
      set,
      CODEX_EFFORT_LEVELS,
    );
    for (var i = 0; i < set.length; i += 1) {
      var opt = document.createElement('option');
      opt.value = set[i];
      opt.textContent = set[i];
      if (set[i] === pick) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function bindCodexModelOptions() {
    var slugs = codexModelSlugs();
    TIERS.forEach(function (tier) {
      var sel = modelCodex[tier];
      if (!sel) return;
      bindSelectOptions(
        sel,
        slugs,
        codexModelMap[tier].model,
        '(codex default)',
      );
      applyCodexModelTitles(sel);
      bindCodexEffortOptions(tier, sel.value);
    });
  }

  function onCodexModelChange(tier) {
    var sel = effortCodex[tier];
    codexModelMap[tier].effort =
      sel && !sel.disabled ? sel.value : codexModelMap[tier].effort;
    applyCodexModelTitles(modelCodex[tier]);
    bindCodexEffortOptions(tier, modelCodex[tier].value);
    renderProviderSummary('codex');
  }

  function applyModels(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var ag =
      src.antigravity && typeof src.antigravity === 'object'
        ? src.antigravity
        : {};
    TIERS.forEach(function (tier) {
      var t =
        ag[tier] && typeof ag[tier] === 'object'
          ? ag[tier]
          : DEFAULT_ANTIGRAVITY_MODEL_MAP[tier];
      // Split whatever spelling is on disk back into the form's two axes: a
      // stored name may already carry its variant (a catalog slug, or a display
      // name in parentheses), and left whole it would sit outside the model list
      // with its effort select dead.
      var stored =
        typeof t.model === 'string'
          ? t.model
          : DEFAULT_ANTIGRAVITY_MODEL_MAP[tier].model;
      var split = parseAgyModel(stored);
      antigravityModelMap[tier] = {
        model: split.model,
        effort: split.effort || (typeof t.effort === 'string' ? t.effort : ''),
      };
    });
    var cl = src.claude && typeof src.claude === 'object' ? src.claude : {};
    TIERS.forEach(function (tier) {
      var t =
        cl[tier] && typeof cl[tier] === 'object'
          ? cl[tier]
          : DEFAULT_CLAUDE_MODEL_MAP[tier];
      claudeModelMap[tier] = {
        model:
          typeof t.model === 'string'
            ? t.model
            : DEFAULT_CLAUDE_MODEL_MAP[tier].model,
        effort: typeof t.effort === 'string' ? t.effort : '',
      };
    });
    var cx = src.codex && typeof src.codex === 'object' ? src.codex : {};
    TIERS.forEach(function (tier) {
      var t =
        cx[tier] && typeof cx[tier] === 'object'
          ? cx[tier]
          : DEFAULT_CODEX_MODEL_MAP[tier];
      codexModelMap[tier] = {
        model:
          typeof t.model === 'string'
            ? t.model
            : DEFAULT_CODEX_MODEL_MAP[tier].model,
        effort: typeof t.effort === 'string' ? t.effort : '',
      };
    });
    bindAgyModelOptions();
    bindClaudeModelOptions();
    bindCodexModelOptions();
  }

  function syncYoutubeAddonInert() {
    if (youtubeEnabled.checked) {
      youtubeDetailWrap.classList.remove('is-inert');
    } else {
      youtubeDetailWrap.classList.add('is-inert');
    }
  }

  function applyYoutubeAddon(raw) {
    var src = raw && typeof raw === 'object' ? raw : DEFAULT_YOUTUBE_ADDON;
    youtubeEnabled.checked = Boolean(src.enabled);
    setRadio(
      'youtube-language',
      typeof src.language === 'string'
        ? src.language
        : DEFAULT_YOUTUBE_ADDON.language,
      YOUTUBE_LANGUAGES,
    );
    var targets =
      src.targets && typeof src.targets === 'object' ? src.targets : {};
    youtubeTargetClaude.checked =
      typeof targets.claude === 'boolean'
        ? targets.claude
        : DEFAULT_YOUTUBE_ADDON.targets.claude;
    youtubeTargetCodex.checked =
      typeof targets.codex === 'boolean'
        ? targets.codex
        : DEFAULT_YOUTUBE_ADDON.targets.codex;
    youtubeTargetAntigravity.checked =
      typeof targets.antigravity === 'boolean'
        ? targets.antigravity
        : DEFAULT_YOUTUBE_ADDON.targets.antigravity;
    syncYoutubeAddonInert();
  }

  function applyConfig(cfg) {
    var r = cfg.ratio || {};
    PROVIDERS.forEach(function (p) {
      ratioState[p] = readProviderRatio(r[p], ratioState[p]);
    });
    strength.value = String(cfg.intervention_strength);
    applyKeywords(cfg.keywords);
    ttl.value = cfg.session_ttl_hours;
    applyTimeouts(cfg.timeouts);
    applyOptionFlags(cfg.option_flags);
    applyArtifacts(cfg.artifacts);
    applyPreamble(cfg.preamble);
    applyRecencyFactor(cfg.recency_factor);
    applyDefaultTier(cfg.default_tier);
    applyModels(cfg.model_map);
    applyYoutubeAddon(cfg.addons && cfg.addons.youtube);
    renderRatio();
    updateStrengthLabel();
    renderAllSummaries();
  }

  function buildOptionFlags() {
    return {
      codex: {
        yolo: Boolean(codexYolo.checked),
        sandbox: readRadio(
          'codex-sandbox',
          CODEX_SANDBOX_MODES,
          DEFAULT_OPTION_FLAGS.codex.sandbox,
        ),
      },
      antigravity: {
        sandbox: Boolean(antigravitySandbox.checked),
        skip_permissions: Boolean(antigravitySkipPerms.checked),
      },
      claude: {
        permission_mode: readRadio(
          'claude-permission-mode',
          CLAUDE_PERMISSION_MODES,
          DEFAULT_OPTION_FLAGS.claude.permission_mode,
        ),
      },
    };
  }

  // `fallbackEffort` covers antigravity's case: the live agy catalog is only
  // populated after the async /provider-status probe resolves, so the effort
  // select can be transiently (or permanently, if agy isn't installed/signed
  // in) disabled on first paint. Without a fallback, saving in that window
  // would silently drop the previously-loaded effort. codex/claude never pass
  // this arg, so their omit-on-disabled behavior (e.g. claude's haiku, which
  // genuinely has no effort levels) is unchanged.
  function buildTierConfig(modelSel, effortSel, effortSetFor, fallbackEffort) {
    var model = modelSel ? String(modelSel.value || '') : '';
    var tierCfg = { model: model };
    var set = effortSetFor(model);
    if (effortSel && !effortSel.disabled && set.length > 0 && effortSel.value) {
      tierCfg.effort = effortSel.value;
    } else if (effortSel && effortSel.disabled && fallbackEffort) {
      tierCfg.effort = fallbackEffort;
    }
    return tierCfg;
  }

  function claudeEffortSet(model) {
    return MODEL_EFFORT_SETS[model] || [];
  }

  function buildModelMap() {
    var codex = {};
    var antigravity = {};
    var claude = {};
    TIERS.forEach(function (tier) {
      codex[tier] = buildTierConfig(
        modelCodex[tier],
        effortCodex[tier],
        codexEffortSet,
      );
      antigravity[tier] = buildTierConfig(
        modelAntigravity[tier],
        effortAntigravity[tier],
        agyEffortSet,
        keptAgyEffort(tier, modelAntigravity[tier].value),
      );
      antigravity[tier].model = joinAgyName(
        antigravity[tier].model,
        antigravity[tier].effort,
      );
      // The joined name already carries the variant, so a separate effort is not
      // just redundant — a dispatcher from an older build appends it a second time
      // ("gemini-3.6-flash-medium (medium)"), which agy rejects. The page re-derives
      // both axes from the name when it loads, so nothing is lost by dropping it.
      delete antigravity[tier].effort;
      claude[tier] = buildTierConfig(
        modelClaude[tier],
        effortClaude[tier],
        claudeEffortSet,
      );
    });
    return {
      codex: codex,
      antigravity: antigravity,
      claude: claude,
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

  function providerRatio(p) {
    return {
      value: ratioState[p].value,
      enabled: ratioState[p].enabled,
      crosscheck_only: Boolean(ratioState[p].crosscheck_only),
    };
  }

  function buildConfig() {
    return {
      ratio: {
        codex: providerRatio('codex'),
        antigravity: providerRatio('antigravity'),
        claude: providerRatio('claude'),
      },
      intervention_strength: Number(strength.value),
      keywords: {
        codex: refs.codex.kw.value.trim(),
        antigravity: refs.antigravity.kw.value.trim(),
        claude: refs.claude.kw.value.trim(),
      },
      option_flags: buildOptionFlags(),
      model_map: buildModelMap(),
      default_tier: {
        codex: readRadio(
          'default-tier-codex',
          TIERS,
          DEFAULT_DEFAULT_TIER.codex,
        ),
        antigravity: readRadio(
          'default-tier-antigravity',
          TIERS,
          DEFAULT_DEFAULT_TIER.antigravity,
        ),
        claude: readRadio(
          'default-tier-claude',
          TIERS,
          DEFAULT_DEFAULT_TIER.claude,
        ),
      },
      session_ttl_hours: Math.max(
        SESSION_TTL_HOURS_MIN,
        Math.min(
          SESSION_TTL_HOURS_MAX,
          Math.floor(Number(ttl.value) || DEFAULT_SESSION_TTL_HOURS),
        ),
      ),
      timeouts: buildTimeouts(),
      artifacts: buildArtifacts(),
      preamble: {
        codex: String(refs.codex.preamble.value || ''),
        antigravity: String(refs.antigravity.preamble.value || ''),
        claude: String(refs.claude.preamble.value || ''),
      },
      recency_factor: {
        codex: readRadio(
          'recency-codex',
          RECENCY_LEVELS,
          DEFAULT_RECENCY.codex,
        ),
        antigravity: readRadio(
          'recency-antigravity',
          RECENCY_LEVELS,
          DEFAULT_RECENCY.antigravity,
        ),
        claude: readRadio(
          'recency-claude',
          RECENCY_LEVELS,
          DEFAULT_RECENCY.claude,
        ),
      },
      addons: {
        youtube: {
          enabled: Boolean(youtubeEnabled.checked),
          language: readRadio(
            'youtube-language',
            YOUTUBE_LANGUAGES,
            DEFAULT_YOUTUBE_ADDON.language,
          ),
          targets: {
            claude: Boolean(youtubeTargetClaude.checked),
            codex: Boolean(youtubeTargetCodex.checked),
            antigravity: Boolean(youtubeTargetAntigravity.checked),
          },
        },
      },
    };
  }

  function withToken(path) {
    return path + '?token=' + encodeURIComponent(token);
  }

  // --- config scope (user / project) ---------------------------------------
  // Contract: cross-platform DETAIL.md "설정 페이지 계약". This page is minified
  // but never bundled, so it cannot import the shared merge helpers — it uses
  // the per-layer state the server already computed.
  var scopeState = {
    paths: { user: '', project: null },
    layers: { user: null, project: null },
    overridden: [],
  };
  var scope = 'user';
  // One normalized document per layer, so moving the toggle re-seats the form
  // without a round trip. The server normalizes both — this page knows neither
  // the schema nor the defaults, and a merge assembled here would put a value
  // on screen that nothing obeys.
  var configByScope = null;

  /**
   * The document the chosen layer prefills from.
   *
   * @returns {object|null} The view for the current scope, or null when the
   *   server sent no per-layer views — the `/config` fallback path.
   */
  function viewForScope() {
    if (configByScope === null) return null;
    return configByScope[scope] || null;
  }

  /** Re-seat the whole form on the layer the toggle now names. */
  function applyScopeConfig() {
    var view = viewForScope();
    if (view !== null) applyConfig(view);
  }

  function adoptScopeState(next) {
    if (!next || typeof next !== 'object') return;
    scopeState = next;
    // Open on the layer that is currently deciding, so pressing Save without
    // touching the toggle rewrites the file the config already came from.
    scope = scopeState.layers && scopeState.layers.project ? 'project' : 'user';
    renderScope();
  }

  function renderScope() {
    var host = document.getElementById('config_scope');
    if (!host) return;
    // Rebuilding the group drops the focused radio, and the inputs are clipped
    // from view — losing focus here would leave arrow-key users with no cursor
    // and nothing on screen to say where it went.
    var hadFocus = host.contains(document.activeElement);
    host.textContent = '';
    [
      ['user', 'User', 'Applies to every project you open.'],
      ['project', 'Project', 'Overrides User for this project only.'],
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
    var hint = document.getElementById('scope_hint');
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

  function tryInlineState() {
    var raw = window.__CENNAD_STATE__;
    if (!raw || typeof raw !== 'object') return false;
    var activeHome = document.getElementById('active-cennad-home');
    if (
      activeHome &&
      typeof raw.activeHome === 'string' &&
      raw.activeHome !== ''
    )
      activeHome.textContent = raw.activeHome;
    if (raw.configByScope) configByScope = raw.configByScope;
    // Adopting the state picks the layer, so the view to seat is settled by
    // the time the form is filled.
    if (raw.scope) adoptScopeState(raw.scope);
    var config =
      viewForScope() || (raw.config && raw.config.ratio ? raw.config : null);
    if (config === null) return false;
    applyConfig(config);
    return true;
  }

  async function fetchProviderStatus() {
    try {
      var res = await fetch(withToken('/provider-status'));
      if (!res.ok) return;
      var body = await res.json();
      PROVIDERS.forEach(function (p) {
        var statusValue = body[p] && body[p].status;
        providerStatus[p] =
          statusValue === 'available' ||
          statusValue === 'unavailable' ||
          statusValue === 'unknown'
            ? statusValue
            : 'unknown';
      });
      agyModels = Array.isArray(body.agyModels) ? body.agyModels : [];
      codexModels = Array.isArray(body.codexModels) ? body.codexModels : [];
      bindAgyModelOptions();
      bindCodexModelOptions();
    } catch (e) {
      return;
    }
    updateInstallHints();
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
      var body = await res.json();
      adoptScopeState(body.state);
      // Reached only when the inline slot was missing. `/config` carries the
      // raw merge and no per-layer views, so the toggle cannot re-seat the
      // form on this path — it stays on what is in effect.
      applyConfig(body.state.effective);
      setStatus('', '');
    } catch (err) {
      setStatus('error', 'Failed to load config: ' + err.message);
    }
    await fetchProviderStatus();
  }

  async function save(closeAfter) {
    var anyEnabled = PROVIDERS.some(function (p) {
      return ratioState[p].enabled;
    });
    if (!anyEnabled) {
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
        body: JSON.stringify({ scope: scope, config: cfg }),
      });
      var body = await res.json();
      if (!res.ok || body.success === false) {
        setStatus('error', body.message || 'Save failed', body.errors);
        return;
      }
      adoptScopeState(body.state);
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
        window.close();
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

  async function cancel() {
    cancelBtn.disabled = saveBtn.disabled = saveCloseBtn.disabled = true;
    try {
      await fetch(withToken('/close'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch (e) {
      /* server closed before responding — expected */
    }
    window.close();
  }

  PROVIDERS.forEach(function (p) {
    refs[p].toggle.addEventListener('click', function () {
      toggleProvider(p);
    });
    refs[p].crosscheckOnly.addEventListener('change', function () {
      ratioState[p].crosscheck_only = refs[p].crosscheckOnly.checked;
      // The remaining routable providers re-split 100% between themselves;
      // this provider's own percent is left exactly as stored.
      renderRatio();
      renderAllSummaries();
    });
    refs[p].advancedToggle.addEventListener('click', function () {
      toggleAdvancedPanel(refs[p].advancedToggle, refs[p].advancedPanel);
    });
  });
  ratioBar.addEventListener('pointerdown', onRatioPointerDown);
  ratioBar.addEventListener('keydown', onRatioKeydown);
  TIERS.forEach(function (tier) {
    if (modelClaude[tier]) {
      modelClaude[tier].addEventListener('change', function () {
        onClaudeModelChange(tier);
      });
    }
    if (modelCodex[tier]) {
      modelCodex[tier].addEventListener('change', function () {
        onCodexModelChange(tier);
      });
    }
    if (modelAntigravity[tier]) {
      modelAntigravity[tier].addEventListener('change', function () {
        onAgyModelChange(tier);
      });
    }
  });
  youtubeAdvancedToggle.addEventListener('click', function () {
    toggleAdvancedPanel(youtubeAdvancedToggle, youtubeAdvancedPanel);
  });
  strength.addEventListener('input', updateStrengthLabel);
  idleTimeoutMin.addEventListener('input', renderTimeoutSummary);
  TIERS.forEach(function (tier) {
    hardCapInputs[tier].addEventListener('input', renderTimeoutSummary);
  });
  codexYolo.addEventListener('change', syncCodexSandboxInert);
  document
    .querySelectorAll('#codex-sandbox-radio input[type="radio"]')
    .forEach(function (r) {
      r.addEventListener('change', syncCodexFullAccessWarning);
    });
  document
    .querySelectorAll('input[name="claude-permission-mode"]')
    .forEach(function (r) {
      r.addEventListener('change', syncClaudeBypassWarning);
    });
  artifactsEnabled.addEventListener('change', syncArtifactsLocationInert);
  youtubeEnabled.addEventListener('change', syncYoutubeAddonInert);
  form.addEventListener('change', renderAllSummaries);
  form.addEventListener('input', renderAllSummaries);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    save(false);
  });
  saveCloseBtn.addEventListener('click', function () {
    save(true);
  });
  cancelBtn.addEventListener('click', function () {
    cancel();
  });

  renderAllSummaries();
  loadConfig();
})();
