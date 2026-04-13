import { describe, it, expect } from 'vitest';
import { adfToMarkdown } from '../../converter/adf-to-markdown.js';
import { markdownToAdf } from '../../converter/markdown-to-adf.js';

describe('adf-to-markdown', () => {
  it('returns null for null/undefined input', () => {
    expect(adfToMarkdown(null)).toBeNull();
    expect(adfToMarkdown(undefined)).toBeNull();
  });

  it('returns string input as-is', () => {
    expect(adfToMarkdown('plain text')).toBe('plain text');
  });

  it('converts text node', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] };
    expect(adfToMarkdown(adf)).toBe('Hello world');
  });

  it('converts heading nodes (levels 1-6)', () => {
    const adf = { type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
    ] };
    const md = adfToMarkdown(adf)!;
    expect(md).toContain('# H1');
    expect(md).toContain('### H3');
  });

  it('converts bold/italic/code/strike marks', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'text', text: 'bold', marks: [{ type: 'strong' }] },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'italic', marks: [{ type: 'em' }] },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'code', marks: [{ type: 'code' }] },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'strike', marks: [{ type: 'strike' }] },
    ] }] };
    const md = adfToMarkdown(adf)!;
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
    expect(md).toContain('`code`');
    expect(md).toContain('~~strike~~');
  });

  it('converts link marks', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'text', text: 'click here', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('[click here](https://example.com)');
  });

  it('converts codeBlock', () => {
    const adf = { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'js' }, content: [{ type: 'text', text: 'const x = 1;' }] }] };
    expect(adfToMarkdown(adf)).toBe('```js\nconst x = 1;\n```');
  });

  it('converts bulletList', () => {
    const adf = { type: 'doc', content: [{ type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item 1' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item 2' }] }] },
    ] }] };
    const md = adfToMarkdown(adf)!;
    expect(md).toContain('- item 1');
    expect(md).toContain('- item 2');
  });

  it('converts orderedList', () => {
    const adf = { type: 'doc', content: [{ type: 'orderedList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }] },
    ] }] };
    const md = adfToMarkdown(adf)!;
    expect(md).toContain('1. first');
    expect(md).toContain('2. second');
  });

  it('converts blockquote', () => {
    const adf = { type: 'doc', content: [{ type: 'blockquote', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'quoted text' }] },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('> quoted text');
  });

  it('converts rule', () => {
    const adf = { type: 'doc', content: [{ type: 'rule' }] };
    expect(adfToMarkdown(adf)).toBe('---');
  });

  it('converts table', () => {
    const adf = { type: 'doc', content: [{ type: 'table', content: [
      { type: 'tableRow', content: [
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
        { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] },
      ] },
      { type: 'tableRow', content: [
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
        { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] },
      ] },
    ] }] };
    const md = adfToMarkdown(adf)!;
    expect(md).toContain('| Name | Value |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| A | 1 |');
  });

  it('converts mention node', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'mention', attrs: { text: '@John' } },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('@John');
  });

  it('converts emoji node', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'emoji', attrs: { shortName: ':thumbsup:', text: '👍' } },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('👍');
  });

  it('converts status node', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'status', attrs: { text: 'IN PROGRESS' } },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('[IN PROGRESS]');
  });

  it('converts inlineCard node', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'inlineCard', attrs: { url: 'https://example.com/page' } },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('https://example.com/page');
  });

  it('converts hardBreak node', () => {
    const adf = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'text', text: 'line 1' },
      { type: 'hardBreak' },
      { type: 'text', text: 'line 2' },
    ] }] };
    expect(adfToMarkdown(adf)).toContain('line 1\nline 2');
  });
});

describe('markdown-to-adf', () => {
  it('produces valid doc structure', () => {
    const adf = markdownToAdf('Hello');
    expect(adf.type).toBe('doc');
    expect(adf.content).toBeDefined();
    expect(adf.content!.length).toBeGreaterThan(0);
  });

  it('converts headings', () => {
    const adf = markdownToAdf('# Title\n## Subtitle');
    const h1 = adf.content!.find((n) => n.type === 'heading' && (n.attrs?.level === 1));
    const h2 = adf.content!.find((n) => n.type === 'heading' && (n.attrs?.level === 2));
    expect(h1).toBeDefined();
    expect(h2).toBeDefined();
  });

  it('converts code blocks with language', () => {
    const adf = markdownToAdf('```typescript\nconst x = 1;\n```');
    const cb = adf.content!.find((n) => n.type === 'codeBlock');
    expect(cb).toBeDefined();
    expect(cb!.attrs?.language).toBe('typescript');
  });

  it('converts bullet list', () => {
    const adf = markdownToAdf('- one\n- two');
    const list = adf.content!.find((n) => n.type === 'bulletList');
    expect(list).toBeDefined();
    expect(list!.content!.length).toBe(2);
  });

  it('converts ordered list', () => {
    const adf = markdownToAdf('1. first\n2. second');
    const list = adf.content!.find((n) => n.type === 'orderedList');
    expect(list).toBeDefined();
    expect(list!.content!.length).toBe(2);
  });

  it('converts blockquote', () => {
    const adf = markdownToAdf('> quoted text');
    const bq = adf.content!.find((n) => n.type === 'blockquote');
    expect(bq).toBeDefined();
  });

  it('converts horizontal rule', () => {
    const adf = markdownToAdf('---');
    const rule = adf.content!.find((n) => n.type === 'rule');
    expect(rule).toBeDefined();
  });

  it('converts table', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const adf = markdownToAdf(md);
    const table = adf.content!.find((n) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table!.content!.length).toBe(2); // header + data row
  });

  it('converts inline bold/italic/code', () => {
    const adf = markdownToAdf('**bold** *italic* `code`');
    const para = adf.content![0];
    expect(para.type).toBe('paragraph');
    const strong = para.content!.find((n) => n.marks?.some((m) => m.type === 'strong'));
    const em = para.content!.find((n) => n.marks?.some((m) => m.type === 'em'));
    const code = para.content!.find((n) => n.marks?.some((m) => m.type === 'code'));
    expect(strong).toBeDefined();
    expect(em).toBeDefined();
    expect(code).toBeDefined();
  });

  it('handles empty input', () => {
    const adf = markdownToAdf('');
    expect(adf.content!.length).toBe(1);
    expect(adf.content![0].type).toBe('paragraph');
  });
});
