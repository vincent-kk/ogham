export function collapsible(summary: string, content: string): string {
  return `<details><summary>${summary}</summary>\n\n${content}\n\n</details>`;
}
