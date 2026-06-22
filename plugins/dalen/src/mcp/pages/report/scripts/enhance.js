// Progressive enhancement: lazy-load heavy renderers only when their nodes
// exist and the renderer is enabled. Each chunk is served locally from
// /assets/*; a missing or failed chunk leaves the readable source in place.

function lazy(selector, chunk, run) {
  if (!document.querySelector(selector)) return;
  import(chunk)
    .then((mod) => run(mod))
    .catch(() => {
      /* offline / not built — source fallback already visible */
    });
}

export function enhance(renderers) {
  const flags = renderers || {};
  if (flags.highlight !== false) {
    lazy("#report pre code[data-lang]", "/assets/highlight.js", (m) =>
      m.highlightAll?.(),
    );
  }
  if (flags.mermaid !== false) {
    lazy("#report .dalen-mermaid", "/assets/mermaid.js", (m) =>
      m.renderAll?.(),
    );
  }
  if (flags.math !== false) {
    lazy("#report .dalen-math", "/assets/katex.js", (m) => m.typesetAll?.());
  }
}
