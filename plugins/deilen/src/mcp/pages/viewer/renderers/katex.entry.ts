import katex from "katex";

/**
 * Typeset every math span as MathML so the browser renders it with its own math
 * font — no bundled KaTeX fonts or CSS. Browser asset entry.
 */
export function typesetAll(): void {
  const nodes = document.querySelectorAll<HTMLElement>("#viewer .deilen-math");
  nodes.forEach((element) => {
    const display = element.getAttribute("data-display") === "1";
    const tex = element.textContent ?? "";
    try {
      katex.render(tex, element, {
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
