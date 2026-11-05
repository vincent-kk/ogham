// Loaded by index.html before app.js; registration supplies the settings request action.
"use strict";

/**
 * Test the current connection and update the supplied UI.
 * @param {object} deps Form readers, UI actions, fetch, and current request state.
 * @returns {void} Starts the request; asynchronous failures appear in the status message.
 */
window.__settingsHelpers.onTest = function onTest(deps) {
  if (!deps.validateForm()) return;

  var data = deps.collectFormData();
  deps.setLoading(true);
  deps.hideStatusMessage();
  deps.showStatusMessage(true, "Testing connection...");

  deps
    .fetch("/test?token=" + encodeURIComponent(deps.TOKEN), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (result) {
      deps.showStatusMessage(
        !!result.success,
        result.message || "Test complete",
      );
    })
    .catch(function (err) {
      deps.showStatusMessage(false, "Request failed: " + err.message);
    })
    .finally(function () {
      deps.setLoading(false);
    });
};
