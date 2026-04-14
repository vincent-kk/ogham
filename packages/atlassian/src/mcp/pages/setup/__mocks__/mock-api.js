// Atlassian Setup UI - Mock API (dev only, file:// protocol only)
'use strict';

(function () {
  if (location.protocol !== 'file:') return;

  var originalFetch = window.fetch;

  function mockResponse(data, status) {
    var body = JSON.stringify(data);
    return new Response(body, {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path = url.replace(/^https?:\/\/[^/]+/, '');
    var method = (init && init.method) ? init.method.toUpperCase() : 'GET';

    if (path === '/status' && method === 'GET') {
      console.log('[mock-api] GET /status');
      return Promise.resolve(mockResponse({ configured: false }));
    }

    if (path === '/test' && method === 'POST') {
      console.log('[mock-api] POST /test');
      return delay(500).then(function () {
        return mockResponse({
          service: 'jira',
          success: true,
          message: 'Connected to jira (Cloud)',
          latency_ms: 123,
        });
      });
    }

    if (path === '/submit' && method === 'POST') {
      console.log('[mock-api] POST /submit');
      return delay(500).then(function () {
        return mockResponse({
          success: true,
          message: 'Configuration saved successfully',
        });
      });
    }

    return originalFetch.apply(window, arguments);
  };
})();
