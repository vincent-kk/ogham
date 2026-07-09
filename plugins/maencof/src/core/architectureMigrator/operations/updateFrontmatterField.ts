/**
 * @file updateFrontmatterField.ts
 * @description 마크다운 frontmatter 의 단일 필드를 갱신하거나 제거한다.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function updateFrontmatterField(
  filePath: string,
  field: string,
  value: unknown,
): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!match) return;

  const yaml = match[2];
  const lines = yaml.split('\n');
  const fieldLine = lines.findIndex((l) => l.startsWith(`${field}:`));

  const valueStr = value === undefined || value === null ? '' : String(value);

  if (fieldLine >= 0)
    if (valueStr === '') lines.splice(fieldLine, 1);
    else lines[fieldLine] = `${field}: ${valueStr}`;
  else if (valueStr !== '') lines.push(`${field}: ${valueStr}`);

  const newContent = `${match[1]}${lines.join('\n')}${match[3]}${content.slice(match[0].length)}`;
  writeFileSync(filePath, newContent, 'utf-8');
}
