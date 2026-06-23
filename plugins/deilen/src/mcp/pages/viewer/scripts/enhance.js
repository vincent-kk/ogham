// Progressive enhancement: lazy-load heavy renderers only when their nodes
// exist and the renderer is enabled. Each chunk is served locally from
// /assets/*; a missing or failed chunk leaves the readable source in place.

function lazy(selector, chunk, run) {
  if (!document.querySelector(selector)) return;
  import(chunk)
    .then((module) => run(module))
    .catch(() => {
      /* offline / not built — source fallback already visible */
    });
}

export function enhance(renderers) {
  const flags = renderers || {};
  if (flags.highlight !== false) {
    lazy("#viewer pre code[data-lang]", "/assets/highlight.js", (module) =>
      module.highlightAll?.(),
    );
  }
  if (flags.mermaid !== false) {
    lazy("#viewer .deilen-mermaid", "/assets/mermaid.js", (module) =>
      module.renderAll?.(),
    );
  }
  if (flags.math !== false) {
    lazy("#viewer .deilen-math", "/assets/katex.js", (module) =>
      module.typesetAll?.(),
    );
  }
}
