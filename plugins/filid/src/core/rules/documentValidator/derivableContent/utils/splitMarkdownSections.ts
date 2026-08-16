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
 */
export function splitMarkdownSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [{ title: '', body: '' }];
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      sections.push({ title: heading[1].trim(), body: '' });
      continue;
    }
    sections[sections.length - 1].body += `${line}\n`;
  }
  return sections;
}
