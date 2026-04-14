import { describe, expect, it } from 'vitest';

import { markdownToAdf, markdownToStorage } from '../index.js';

describe('markdownToStorage', () => {
  it('renders headings, lists, tables, images, and code blocks', () => {
    const markdown = [
      '# Title',
      '',
      '- **Bold** item',
      '',
      '| Name | Link |',
      '| --- | --- |',
      '| Doc | [Guide](https://example.com) |',
      '',
      '![diagram](https://example.com/image.png)',
      '',
      '```ts',
      'const value = 1;',
      '```',
    ].join('\n');

    expect(markdownToStorage(markdown)).toBe(
      '<h1>Title</h1>' +
        '<ul><li><p><strong>Bold</strong> item</p></li></ul>' +
        '<table><tbody><tr><th>Name</th><th>Link</th></tr><tr><td>Doc</td><td><a href="https://example.com">Guide</a></td></tr></tbody></table>' +
        '<p><ac:image><ri:url ri:value="https://example.com/image.png" /></ac:image></p>' +
        '<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">ts</ac:parameter><ac:plain-text-body><![CDATA[const value = 1;]]></ac:plain-text-body></ac:structured-macro>',
    );
  });
});

describe('markdownToAdf', () => {
  it('reuses the shared markdown parser for block structures', () => {
    const markdown = [
      '## Title',
      '',
      '> quoted',
      '',
      '1. first',
      '2. second',
      '',
      '| Name | Value |',
      '| --- | --- |',
      '| one | **two** |',
    ].join('\n');

    expect(markdownToAdf(markdown)).toEqual({
      type: 'doc',
      attrs: { version: 1 },
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'quoted' }],
            },
          ],
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'first' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'second' }],
                },
              ],
            },
          ],
        },
        {
          type: 'table',
          attrs: { isNumberColumnEnabled: false, layout: 'default' },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Name' }],
                    },
                  ],
                },
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Value' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'one' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'two',
                          marks: [{ type: 'strong' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
