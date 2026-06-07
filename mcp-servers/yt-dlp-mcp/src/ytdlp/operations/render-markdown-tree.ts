import type { CommentNode } from '../../domain/types.js';

function badges(node: CommentNode): string {
  const marks: string[] = [];
  if (node.isUploader) {
    marks.push('UPLOADER');
  }
  if (node.isPinned) {
    marks.push('PINNED');
  }
  return marks.length > 0 ? ` [${marks.join(', ')}]` : '';
}

function renderNode(node: CommentNode, lines: string[]): void {
  const indent = '  '.repeat(node.depth);
  lines.push(`${indent}- **${node.author}**${badges(node)} · ${node.likeCount ?? 0} likes · ${node.timeText ?? ''}`.trimEnd());
  for (const textLine of node.text.split('\n')) {
    lines.push(`${indent}  | ${textLine}`);
  }
  for (const reply of node.replies ?? []) {
    renderNode(reply, lines);
  }
}

/** Renders threaded comments as AI-friendly Markdown (one block per root thread). */
export function renderMarkdownTree(roots: CommentNode[]): string {
  const lines: string[] = [];
  roots.forEach((root, index) => {
    lines.push(`## Thread ${index + 1}`);
    renderNode(root, lines);
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}
