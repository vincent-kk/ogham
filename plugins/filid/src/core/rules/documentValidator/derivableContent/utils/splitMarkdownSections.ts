/** One `## `-level slice of a markdown document. */
export interface MarkdownSection {
  /** Heading text without the leading hashes, or '' for the preamble */
  title: string;
  /** Body lines of the section, fenced code blocks removed */
  body: string;
}

/**
 * Split a markdown document into `## `-level sections with fenced code blocks
 * stripped, so token scans never read example code as document content.
 * @param content - Complete Markdown input with backtick or tilde fences.
 * @returns Level-two sections in source order, excluding fenced examples.
 */
export function splitMarkdownSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [{ title: '', body: '' }];
  let fence = '';
  for (const line of content.split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = '';
      continue;
    }
    if (marker && (marker[1][0] !== '`' || !marker[2].includes('`'))) {
      fence = marker[1];
      continue;
    }
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      sections.push({ title: heading[1].trim(), body: '' });
      continue;
    }
    sections[sections.length - 1].body += `${line}\n`;
  }
  return sections;
}
