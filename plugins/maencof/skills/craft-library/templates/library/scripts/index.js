(function () {
  var input = document.getElementById('library-search');
  var target = document.getElementById('library-list');
  var status = document.getElementById('library-status');
  var catalog = Array.isArray(MAENCOF_LIBRARY_CATALOG)
    ? MAENCOF_LIBRARY_CATALOG
    : [];

  function refresh() {
    var entries = MAENCOF_FILTER_LIBRARY(catalog, input.value);
    MAENCOF_RENDER_LIBRARY(entries, target);
    status.textContent =
      entries.length + ' article' + (entries.length === 1 ? '' : 's');
  }

  input.addEventListener('input', refresh);
  refresh();
})();
