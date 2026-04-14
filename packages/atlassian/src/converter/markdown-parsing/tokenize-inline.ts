export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'strike'; text: string }
  | { type: 'image'; alt: string; url: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'em'; text: string };

const INLINE_RE_WITH_IMAGES =
  /`([^`]+)`|\*\*(.+?)\*\*|~~(.+?)~~|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

const INLINE_RE_WITHOUT_IMAGES =
  /`([^`]+)`|\*\*(.+?)\*\*|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

export function tokenizeInlineMarkdown(
  text: string,
  options: { supportImages?: boolean } = {},
): InlineToken[] {
  if (!text) return [];

  const tokens: InlineToken[] = [];
  const regex = options.supportImages ? INLINE_RE_WITH_IMAGES : INLINE_RE_WITHOUT_IMAGES;
  let position = 0;

  regex.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > position) {
      tokens.push({ type: 'text', text: text.slice(position, match.index) });
    }

    if (options.supportImages) {
      const [, code, strong, strike, alt, url, linkText, href, em] = match;

      if (code !== undefined) {
        tokens.push({ type: 'code', text: code });
      } else if (strong !== undefined) {
        tokens.push({ type: 'strong', text: strong });
      } else if (strike !== undefined) {
        tokens.push({ type: 'strike', text: strike });
      } else if (alt !== undefined) {
        tokens.push({ type: 'image', alt, url: url ?? '' });
      } else if (linkText !== undefined) {
        tokens.push({ type: 'link', text: linkText, href: href ?? '' });
      } else if (em !== undefined) {
        tokens.push({ type: 'em', text: em });
      }
    } else {
      const [, code, strong, strike, linkText, href, em] = match;

      if (code !== undefined) {
        tokens.push({ type: 'code', text: code });
      } else if (strong !== undefined) {
        tokens.push({ type: 'strong', text: strong });
      } else if (strike !== undefined) {
        tokens.push({ type: 'strike', text: strike });
      } else if (linkText !== undefined) {
        tokens.push({ type: 'link', text: linkText, href: href ?? '' });
      } else if (em !== undefined) {
        tokens.push({ type: 'em', text: em });
      }
    }

    position = match.index + match[0].length;
  }

  if (position < text.length) {
    tokens.push({ type: 'text', text: text.slice(position) });
  }

  if (tokens.length === 0) {
    tokens.push({ type: 'text', text });
  }

  return tokens;
}
