import { describe, expect, it } from 'vitest';

import { adfToMarkdown, storageToMarkdown } from '../index.js';
import { stripTagsFallback } from '../storage-to-markdown/strip-tags-fallback.js';

describe('storageToMarkdown', () => {
  it('renders tables and structured macros as markdown', () => {
    const storage = [
      '<table><tbody>',
      '<tr><th>Name</th><th>Role</th></tr>',
      '<tr><td>Vincent</td><td><strong>Owner</strong></td></tr>',
      '</tbody></table>',
      '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Heads up</p></ac:rich-text-body></ac:structured-macro>',
    ].join('');

    expect(storageToMarkdown(storage)).toBe(
      '| Name | Role |\n| --- | --- |\n| Vincent | **Owner** |\n\n> [info]: Heads up',
    );
  });

  it('strips tags in the fallback helper', () => {
    expect(stripTagsFallback('<p>Hello<div>world')).toBe('Hello world');
  });
});

describe('adfToMarkdown', () => {
  it('renders marks, tables, and special blocks', () => {
    const adf = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world', marks: [{ type: 'strong' }] },
          ],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Key' }],
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
                      content: [{ type: 'text', text: 'mode' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'safe' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'panel',
          attrs: { panelType: 'info' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Read me' }] },
          ],
        },
      ],
    };

    expect(adfToMarkdown(adf)).toBe(
      'Hello **world**\n\n| Key | Value |\n| --- | --- |\n| mode | safe |\n\n> **info**: Read me',
    );
  });
});
