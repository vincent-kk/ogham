// Image attachments: paste / drop -> Blob + object-URL thumbnail. The bare id
// becomes the comment's imageId and the multipart part name (img_<id>).

const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]/gi;

let counter = 0;

function nextId() {
  counter += 1;
  return `i${Date.now().toString(36)}${counter}`;
}

function extensionForMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  return (mimeType.split("/")[1] || "png").replace(
    NON_ALPHANUMERIC_PATTERN,
    "",
  );
}

function toAttachment(blob, source) {
  return {
    id: nextId(),
    blob,
    name: blob.name || `${source}-${nextId()}.${extensionForMime(blob.type)}`,
    url: URL.createObjectURL(blob),
    source,
  };
}

export function wireImageCapture(zone, onAdd) {
  zone.addEventListener("paste", (event) => {
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) onAdd(toAttachment(file, "clipboard"));
      }
    }
  });
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
    const files = event.dataTransfer?.files || [];
    for (const file of files) {
      if (file.type.startsWith("image/")) onAdd(toAttachment(file, "file"));
    }
  });
}
