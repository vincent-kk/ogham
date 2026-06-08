const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const PATH_ID_RE = /\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/;

/**
 * Best-effort YouTube video id extraction. Returns null for non-YouTube URLs
 * (those still work as opaque targets; the id is only used for cache keys/labels).
 */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return ID_RE.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const v = url.searchParams.get('v');
    if (v && ID_RE.test(v)) return v;
    const match = url.pathname.match(PATH_ID_RE);
    if (match) return match[1];
  }

  return null;
}
