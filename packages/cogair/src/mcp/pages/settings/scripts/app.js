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
  var ratioGemini = $('#ratio-gemini');
  var ratioCodex = $('#ratio-codex');
  var ratioBarGemini = document.querySelector('.ratio-bar-gemini');
  var ratioBarCodex = document.querySelector('.ratio-bar-codex');
  var geminiPct = $('#gemini-pct');
  var codexPct = $('#codex-pct');
  var strength = $('#strength');
  var strengthLabel = $('#strength-label');
  var kwGemini = $('#kw-gemini');
  var kwCodex = $('#kw-codex');
  var ttl = $('#ttl');
  var multiAgent = $('#multi-agent');
  var status = $('#status');
  var saveBtn = $('#save');
  var saveCloseBtn = $('#save-close');

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

  function updateRatioBar() {
    var g = Math.max(0, Number(ratioGemini.value) || 0);
    var c = Math.max(0, Number(ratioCodex.value) || 0);
    var total = g + c;
    var gPct = total === 0 ? 50 : (g / total) * 100;
    var cPct = total === 0 ? 50 : (c / total) * 100;
    ratioBarGemini.style.flexBasis = gPct + '%';
    ratioBarCodex.style.flexBasis = cPct + '%';
    geminiPct.textContent = total === 0 ? '—' : Math.round(gPct) + '%';
    codexPct.textContent = total === 0 ? '—' : Math.round(cPct) + '%';
  }

  function updateStrengthLabel() {
    strengthLabel.textContent = STRENGTH_LABELS[strength.value] || 'Neutral';
  }

  function applyConfig(cfg) {
    ratioGemini.value = cfg.ratio.gemini;
    ratioCodex.value = cfg.ratio.codex;
    strength.value = String(cfg.intervention_strength);
    kwGemini.value = cfg.keywords.gemini;
    kwCodex.value = cfg.keywords.codex;
    ttl.value = cfg.session_ttl_hours;
    multiAgent.checked = Boolean(
      cfg.default_options && cfg.default_options.multi_agent,
    );
    var radio = document.querySelector(
      'input[name="model"][value="' + cfg.default_model + '"]',
    );
    if (radio) radio.checked = true;
    updateRatioBar();
    updateStrengthLabel();
  }

  function buildConfig() {
    var modelEl = document.querySelector('input[name="model"]:checked');
    return {
      ratio: {
        gemini: Math.max(0, Math.floor(Number(ratioGemini.value) || 0)),
        codex: Math.max(0, Math.floor(Number(ratioCodex.value) || 0)),
      },
      intervention_strength: Number(strength.value),
      keywords: {
        gemini: kwGemini.value.trim(),
        codex: kwCodex.value.trim(),
      },
      default_model: modelEl ? modelEl.value : 'auto',
      default_options: { multi_agent: multiAgent.checked },
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

  ratioGemini.addEventListener('input', updateRatioBar);
  ratioCodex.addEventListener('input', updateRatioBar);
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
