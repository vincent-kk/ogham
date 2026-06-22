// Copy affordances: the whole report (raw markdown) and per code block.

function flash(btn, labelEl) {
  const target = labelEl || btn;
  const prev = target.textContent;
  btn.classList.add("copied");
  target.textContent = "Copied";
  window.setTimeout(() => {
    btn.classList.remove("copied");
    target.textContent = prev;
  }, 1400);
}

function write(text, onOk) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(onOk, () => {});
}

function addCodeCopyButtons() {
  document.querySelectorAll("#report pre").forEach((pre) => {
    if (pre.classList.contains("deilen-mermaid")) return;
    const code = pre.querySelector("code");
    if (!code) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "Copy";
    btn.addEventListener("click", () =>
      write(code.textContent || "", () => flash(btn)),
    );
    pre.appendChild(btn);
  });
}

export function initCopy(state) {
  const copyAll = document.getElementById("copy-all");
  copyAll?.addEventListener("click", () =>
    write(state.raw || "", () =>
      flash(copyAll, copyAll.querySelector(".icon-btn-label")),
    ),
  );
  addCodeCopyButtons();
}
