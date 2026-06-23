// Copy affordances: the whole viewer (raw markdown) and per code block.

const COPIED_LABEL_MS = 1500;

function flash(button, labelElement) {
  const target = labelElement || button;
  const previous = target.textContent;
  button.classList.add("copied");
  target.textContent = "Copied";
  window.setTimeout(() => {
    button.classList.remove("copied");
    target.textContent = previous;
  }, COPIED_LABEL_MS);
}

function write(text, onSuccess) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(onSuccess, () => {});
}

function addCodeCopyButtons() {
  document.querySelectorAll("#viewer pre").forEach((preElement) => {
    if (preElement.classList.contains("deilen-mermaid")) return;
    const code = preElement.querySelector("code");
    if (!code) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "Copy";
    button.addEventListener("click", () =>
      write(code.textContent || "", () => flash(button)),
    );
    preElement.appendChild(button);
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
