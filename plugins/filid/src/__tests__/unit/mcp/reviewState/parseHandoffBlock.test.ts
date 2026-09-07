import { describe, expect, it } from 'vitest';

import { parseHandoffBlock } from '../../../../mcp/tools/reviewState/scope/parseHandoffBlock.js';
import { REVIEW_HANDOFF_SEED_SCHEMA } from '../../../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';

/** Valid Stage 1 payload shared by parser boundary cases. */
const HANDOFF_SEED = REVIEW_HANDOFF_SEED_SCHEMA.parse({
  schema: 1,
  snapshotHash: 'snapshot-hash',
  scope: ['src'],
  documentSync: 'committed',
  repaired: 2,
  recorded: [
    {
      class: 'code-change',
      ruleId: 'boundary-import',
      path: 'src/a.ts',
      severity: 'warning',
      certainty: 'exact',
      note: 'Confirm the boundary against the tree.',
    },
  ],
  truncated: 0,
});

/** Complete machine block bounded by its own opening and closing lines. */
const HANDOFF_BLOCK = `<!-- filid:handoff v1\n${JSON.stringify(HANDOFF_SEED)}\n-->`;

describe('parseHandoffBlock', () => {
  it('parses a valid block and removes only that block from the remainder', () => {
    const prefix = '<details>Human handoff table</details>\n';
    expect(parseHandoffBlock(`${prefix}${HANDOFF_BLOCK}\nAfter`)).toEqual({
      handoff: HANDOFF_SEED,
      remainder: `${prefix}\nAfter`,
      diagnostics: [],
    });
  });

  it('accepts an unknown snapshot hash when document synchronization failed', () => {
    const seed = {
      ...HANDOFF_SEED,
      snapshotHash: null,
      documentSync: 'failed',
    };
    const result = parseHandoffBlock(
      `<!-- filid:handoff v1\n${JSON.stringify(seed)}\n-->`,
    );
    expect(result).toEqual({ handoff: seed, remainder: '', diagnostics: [] });
  });

  it('returns null and untouched text when no block is present', () => {
    const changeContext =
      'Change summary\n<details>Human handoff table</details>';
    expect(parseHandoffBlock(changeContext)).toEqual({
      handoff: null,
      remainder: changeContext,
      diagnostics: [],
    });
  });

  it('reports one invalid diagnostic and preserves text for malformed JSON', () => {
    const changeContext = 'Before\n<!-- filid:handoff v1\n{broken}\n-->\nAfter';
    expect(parseHandoffBlock(changeContext)).toEqual({
      handoff: null,
      remainder: changeContext,
      diagnostics: [
        { code: 'review-handoff-invalid', message: expect.any(String) },
      ],
    });
  });

  it('reports one invalid diagnostic and preserves an unknown claim class', () => {
    const seed = {
      ...HANDOFF_SEED,
      recorded: [{ ...HANDOFF_SEED.recorded[0], class: 'unknown' }],
    };
    const changeContext = `Before\n<!-- filid:handoff v1\n${JSON.stringify(seed)}\n-->\nAfter`;
    expect(parseHandoffBlock(changeContext)).toEqual({
      handoff: null,
      remainder: changeContext,
      diagnostics: [
        {
          code: 'review-handoff-invalid',
          message: expect.stringContaining('recorded.0.class:'),
        },
      ],
    });
  });

  it('reports one invalid diagnostic and preserves a block with 41 entries', () => {
    const seed = {
      ...HANDOFF_SEED,
      recorded: Array.from({ length: 41 }, () => HANDOFF_SEED.recorded[0]),
    };
    const changeContext = `<!-- filid:handoff v1\n${JSON.stringify(seed)}\n-->`;
    expect(parseHandoffBlock(changeContext)).toEqual({
      handoff: null,
      remainder: changeContext,
      diagnostics: [
        {
          code: 'review-handoff-invalid',
          message: expect.stringContaining('recorded:'),
        },
      ],
    });
  });

  it('parses only the first block and leaves a second block as text', () => {
    const secondBlock = `<!-- filid:handoff v1\n${JSON.stringify({ ...HANDOFF_SEED, snapshotHash: 'second-snapshot' })}\n-->`;
    expect(parseHandoffBlock(`${HANDOFF_BLOCK}\n${secondBlock}`)).toEqual({
      handoff: HANDOFF_SEED,
      remainder: `\n${secondBlock}`,
      diagnostics: [],
    });
  });

  it('produces the same result for CRLF and LF bodies', () => {
    const changeContext = `Before\n${HANDOFF_BLOCK}\nAfter`;
    const expected = parseHandoffBlock(changeContext);
    expect(parseHandoffBlock(changeContext.replace(/\n/g, '\r\n'))).toEqual(
      expected,
    );
    expect(parseHandoffBlock(changeContext.replace(/\n/g, '\r'))).toEqual(
      expected,
    );
  });
});
