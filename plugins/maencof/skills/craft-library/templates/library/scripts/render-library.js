var MAENCOF_RENDER_LIBRARY = function (entries, target) {
  target.replaceChildren();
  var groups = new Map();

  entries.forEach(function (entry) {
    var group = entry.group || 'Ungrouped';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  });

  groups.forEach(function (groupEntries, groupName) {
    var section = document.createElement('section');
    section.className = 'library-group';

    var heading = document.createElement('h2');
    heading.textContent = groupName;
    section.appendChild(heading);

    groupEntries.forEach(function (entry) {
      var item = document.createElement('article');
      item.className = 'library-entry';

      var link = document.createElement('a');
      link.href = entry.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = entry.name;
      item.appendChild(link);

      var metadata = document.createElement('div');
      metadata.className = 'library-entry-meta';
      metadata.textContent = [entry.createdAt]
        .concat(entry.tags || [])
        .filter(Boolean)
        .join(' · ');
      item.appendChild(metadata);
      section.appendChild(item);
    });

    target.appendChild(section);
  });
};
