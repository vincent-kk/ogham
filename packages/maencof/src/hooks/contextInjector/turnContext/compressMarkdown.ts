/**
 * @file compressMarkdown.ts
 * @description Strip YAML frontmatter, headings, and blank prefix; return first paragraph.
 */

/**
 * frontmatter / heading / 빈 줄을 잘라낸 본문 첫 단락을 maxChars 이내로 반환한다.
 */
export function compressMarkdownBody(content: string, maxChars = 150): string {
  let text = content.replace(/^---[\s\S]*?---\n?/, '');
  const lines = text.split('\n');
  const bodyLines: string[] = [];
  let inBody = false;
  for (const line of lines) {
    if (!inBody) {
      if (line.startsWith('#') || line.trim() === '') continue;
      inBody = true;
    }
    bodyLines.push(line);
  }
  text = bodyLines.join('\n');
  const firstPara = text.split(/\n\n/)[0] ?? '';
  const flat = firstPara.replace(/\n/g, ' ').trim();
  return flat.length > maxChars ? flat.slice(0, maxChars) : flat;
}
