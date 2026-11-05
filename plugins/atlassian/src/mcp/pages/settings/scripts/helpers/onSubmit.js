// Loaded by index.html before app.js; registration supplies the settings request action.
"use strict";

/**
 * Submit validated settings and update the supplied UI.
 * @param {boolean} closeAfter Whether a successful save completes setup.
 * @param {object} deps Form readers, UI actions, fetch, and current request state.
 * @returns {void} Starts the request; asynchronous failures appear in the status message.
 */
window.__settingsHelpers.onSubmit = function onSubmit(closeAfter, deps) {
  if (!deps.validateForm()) return;

  if (deps.state.editMode) {
    var confirmed = deps.window.confirm(
      "This will overwrite existing settings. Continue?",
    );
    if (!confirmed) return;
  }

  var data = deps.collectFormData();
  data.closeAfter = closeAfter;
  data.scope = deps.configScope;
  deps.setLoading(true);
  deps.hideStatusMessage();
  deps.showStatusMessage(true, "Testing connection...");

  deps
    .fetch("/submit?token=" + encodeURIComponent(deps.TOKEN), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (result) {
      if (result.success) {
        if (closeAfter) {
          deps.showSuccessScreen();
        } else {
          deps.showStatusMessage(true, "Saved. Settings updated.");
        }
      } else {
        deps.showStatusMessage(false, result.message || "Save failed");
      }
    })
    .catch(function (err) {
      deps.showStatusMessage(false, "Request failed: " + err.message);
    })
    .finally(function () {
      deps.setLoading(false);
    });
};
