import katex from "katex";

/**
 * Typeset every math span as MathML so the browser renders it with its own math
 * font — no bundled KaTeX fonts or CSS. Browser asset entry.
 */
export function typesetAll(): void {
  const nodes = document.querySelectorAll<HTMLElement>("#report .deilen-math");
  nodes.forEach((el) => {
    const display = el.getAttribute("data-display") === "1";
    const tex = el.textContent ?? "";
    try {
      katex.render(tex, el, {
        displayMode: display,
        throwOnError: false,
        trust: false,
        output: "mathml",
      });
    } catch {
      /* leave the raw source visible */
    }
  });
}
