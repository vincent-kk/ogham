/**
 * @file buildStubDocument.ts
 * @description 만료 원본으로부터 경량 스텁 마크다운을 생성한다 (frontmatter 보존 + 요약 + 링크).
 */
import { extractWikiLinkLines } from './extractWikiLinkLines.js';
import { fileBaseName } from './fileBaseName.js';
import { firstParagraph } from './firstParagraph.js';
import type { MinimalFrontmatter } from './parseMinimalFrontmatter.js';
import { quoteYamlScalar } from './quoteYamlScalar.js';

export function buildStubDocument(
  frontmatter: MinimalFrontmatter,
  body: string,
  archivePath: string,
  today: string,
  absolutePath: string,
): string {
  const frontmatterLines = [
    '---',
    `created: ${frontmatter.created ?? today}`,
    `updated: ${today}`,
    `tags: ${frontmatter.rawTagsValue ?? '[archived]'}`,
    'layer: 4',
    'archived: true',
    `archive_path: ${quoteYamlScalar(archivePath)}`,
  ];
  if (frontmatter.title)
    frontmatterLines.push(`title: ${quoteYamlScalar(frontmatter.title)}`);
  frontmatterLines.push('---');

  const title = frontmatter.title ?? fileBaseName(absolutePath);
  const summary = firstParagraph(body);
  const wikiLinkLines = extractWikiLinkLines(body);

  const bodyLines = [
    `# ${title}`,
    '',
    `> 📦 Archived — canonical original at: \`${archivePath}\``,
    '> Meta-knowledge is distilled to L2 when harvested via `/archive-harvest`.',
  ];
  if (summary) bodyLines.push('', '## Summary', summary);
  if (wikiLinkLines.length > 0)
    bodyLines.push('', '## Links (preserved)', ...wikiLinkLines);

  return `${frontmatterLines.join('\n')}\n${bodyLines.join('\n')}\n`;
}
