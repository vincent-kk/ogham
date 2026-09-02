var MAENCOF_FILTER_LIBRARY = function (entries, query) {
  var terms = String(query || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return entries.slice();

  return entries.filter(function (entry) {
    var searchable = [entry.name]
      .concat(entry.tags || [], entry.searchTerms || [])
      .join(' ')
      .normalize('NFKC')
      .toLocaleLowerCase();
    return terms.every(function (term) {
      return searchable.includes(term);
    });
  });
};
