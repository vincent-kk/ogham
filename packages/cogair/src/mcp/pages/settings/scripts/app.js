(function () {
  'use strict';

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
  var ratioWarn = $('#ratio-warn');
  var strength = $('#strength');
  var strengthLabel = $('#strength-label');
  var kwGemini = $('#kw-gemini');
  var kwCodex = $('#kw-codex');
  var ttl = $('#ttl');
  var multiAgent = $('#multi-agent');
  var status = $('#status');
  var saveBtn = $('#save');
  var saveCloseBtn = $('#save-close');

  var ratioState = {
    gemini: { value: 50, enabled: true },
    codex: { value: 50, enabled: true },
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

    ratioWarn.hidden = gEn || cEn;
  }

  function onSlider() {
    if (ratioSlider.disabled) return;
    var g = clamp(Math.floor(Number(ratioSlider.value) || 0), 0, 100);
    ratioState.gemini.value = g;
    ratioState.codex.value = 100 - g;
    renderRatio();
  }

  function toggleProvider(name) {
    var entry = ratioState[name];
    var other = name === 'gemini' ? ratioState.codex : ratioState.gemini;
    if (entry.enabled) {
      entry.enabled = false;
    } else {
      entry.enabled = true;
      if (entry.value <= 0) entry.value = 50;
      if (other.enabled) {
        other.value = clamp(100 - entry.value, 0, 100);
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
        value: clamp(Math.floor(Number(raw.value) || 0), 0, 100),
        enabled: Boolean(raw.enabled),
      };
    }
    if (typeof raw === 'number') {
      var n = clamp(Math.floor(raw), 0, 100);
      return { value: n, enabled: n > 0 };
    }
    return { value: fallback.value, enabled: fallback.enabled };
  }

  function applyConfig(cfg) {
    var r = cfg.ratio || {};
    ratioState.gemini = readProviderRatio(r.gemini, ratioState.gemini);
    ratioState.codex = readProviderRatio(r.codex, ratioState.codex);

    strength.value = String(cfg.intervention_strength);
    kwGemini.value = cfg.keywords.gemini;
    kwCodex.value = cfg.keywords.codex;
    ttl.value = cfg.session_ttl_hours;
    multiAgent.checked = false;
    var radio = document.querySelector(
      'input[name="model"][value="' + cfg.default_model + '"]',
    );
    if (radio) radio.checked = true;

    renderRatio();
    updateStrengthLabel();
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
      default_model: modelEl ? modelEl.value : 'auto',
      default_options: { multi_agent: false },
      session_ttl_hours: Math.max(
        1,
        Math.min(720, Math.floor(Number(ttl.value) || 72)),
      ),
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

  async function loadConfig() {
    if (tryInlineState()) {
      setStatus('', '');
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
  strength.addEventListener('input', updateStrengthLabel);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    save(false);
  });
  saveCloseBtn.addEventListener('click', function () {
    save(true);
  });

  loadConfig();
})();
