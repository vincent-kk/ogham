import mermaid from "mermaid";

function isDark(): boolean {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: isDark() ? "dark" : "default",
});

/** Render every mermaid block to SVG (strict mode). Browser asset entry. */
export async function renderAll(): Promise<void> {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("#report .deilen-mermaid"),
  );
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const src = node.querySelector(".deilen-mermaid-src")?.textContent ?? "";
    try {
      const { svg } = await mermaid.render(`deilen-mermaid-${i}`, src);
      node.innerHTML = svg;
    } catch {
      const badge = document.createElement("div");
      badge.className = "render-error";
      badge.textContent = "diagram failed to render";
      node.appendChild(badge);
    }
  }
}
