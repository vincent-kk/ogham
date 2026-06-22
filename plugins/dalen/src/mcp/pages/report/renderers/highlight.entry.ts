import hljs from "highlight.js";

/** Highlight every code block tagged with a language. Browser asset entry. */
export function highlightAll(): void {
  const blocks = document.querySelectorAll<HTMLElement>(
    "#report pre code[data-lang]",
  );
  blocks.forEach((el) => {
    try {
      hljs.highlightElement(el);
    } catch {
      /* leave the code block as plain text */
    }
  });
}
