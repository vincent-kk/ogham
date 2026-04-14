import { describe, it, expect } from 'vitest';
import { markdownToStorage, storageToMarkdown } from '../../converter/index.js';

describe('storage-to-markdown', () => {
  it('returns empty string for empty input', () => {
    expect(storageToMarkdown('')).toBe('');
    expect(storageToMarkdown('  ')).toBe('');
  });

  it('converts paragraphs', () => {
    const result = storageToMarkdown('<p>Hello world</p>');
    expect(result).toContain('Hello world');
  });

  it('converts headings', () => {
    const result = storageToMarkdown('<h1>Title</h1><h2>Subtitle</h2>');
    expect(result).toContain('# Title');
    expect(result).toContain('## Subtitle');
  });

  it('converts bold and italic', () => {
    const result = storageToMarkdown('<p><strong>bold</strong> and <em>italic</em></p>');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
  });

  it('converts inline code', () => {
    const result = storageToMarkdown('<p>Use <code>npm install</code></p>');
    expect(result).toContain('`npm install`');
  });

  it('converts links', () => {
    const result = storageToMarkdown('<p><a href="https://example.com">Click</a></p>');
    expect(result).toContain('[Click](https://example.com)');
  });

  it('converts unordered list', () => {
    const result = storageToMarkdown('<ul><li>one</li><li>two</li></ul>');
    expect(result).toContain('- one');
    expect(result).toContain('- two');
  });

  it('converts ordered list', () => {
    const result = storageToMarkdown('<ol><li>first</li><li>second</li></ol>');
    expect(result).toContain('1. first');
    expect(result).toContain('2. second');
  });

  it('converts blockquote', () => {
    const result = storageToMarkdown('<blockquote><p>quoted</p></blockquote>');
    expect(result).toContain('> quoted');
  });

  it('converts table', () => {
    const html = '<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>';
    const result = storageToMarkdown(html);
    expect(result).toContain('| A | B |');
    expect(result).toContain('| 1 | 2 |');
  });

  it('handles Confluence macros gracefully', () => {
    const html = '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note text</p></ac:rich-text-body></ac:structured-macro>';
    const result = storageToMarkdown(html);
    expect(result).toContain('info');
    expect(result).toContain('Note text');
  });
});

describe('markdown-to-storage', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToStorage('')).toBe('');
    expect(markdownToStorage('  ')).toBe('');
  });

  it('converts paragraphs', () => {
    const result = markdownToStorage('Hello world');
    expect(result).toContain('<p>Hello world</p>');
  });

  it('converts headings', () => {
    const result = markdownToStorage('# Title');
    expect(result).toContain('<h1>Title</h1>');
  });

  it('converts bold and italic', () => {
    const result = markdownToStorage('**bold** *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('converts code blocks to Confluence macro', () => {
    const result = markdownToStorage('```js\nconst x = 1;\n```');
    expect(result).toContain('ac:structured-macro');
    expect(result).toContain('const x = 1;');
  });

  it('converts links', () => {
    const result = markdownToStorage('[Click](https://example.com)');
    expect(result).toContain('<a href="https://example.com">Click</a>');
  });

  it('converts lists', () => {
    const result = markdownToStorage('- one\n- two');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('converts horizontal rule', () => {
    const result = markdownToStorage('---');
    expect(result).toContain('<hr />');
  });

  it('converts table', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const result = markdownToStorage(md);
    expect(result).toContain('<table>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
  });
});
