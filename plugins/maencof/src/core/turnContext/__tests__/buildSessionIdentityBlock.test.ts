import { describe, expect, it } from 'vitest';

import type { CompanionIdentityV2Minimal } from '../../../types/companionGuard.js';
import { buildSessionIdentityBlock } from '../buildSessionIdentityBlock.js';

function identity(
  sections: CompanionIdentityV2Minimal['sections'],
  role?: string,
): CompanionIdentityV2Minimal {
  return { schema_version: 2, name: 'Nao', role, greeting: 'Hi', sections };
}

describe('buildSessionIdentityBlock — full session render (§3, §4)', () => {
  it('emits a binding companion-identity-full block with the role clause', () => {
    const block = buildSessionIdentityBlock(
      identity(
        [{ key: 'tone', inject: 'both', salience: 5, detail: 'calm' }],
        'mirror advisor',
      ),
    );
    expect(block).toContain('<companion-identity-full enforcement="binding">');
    expect(block).toContain('You are Nao, whose role is: mirror advisor.');
    expect(block).toContain('</companion-identity-full>');
  });

  it('includes session/both sections and excludes turn-only sections', () => {
    const block = buildSessionIdentityBlock(
      identity([
        {
          key: 'origin',
          inject: 'session',
          salience: 1,
          detail: 'the backstory',
        },
        { key: 'tone', inject: 'both', salience: 5, detail: 'calm' },
        { key: 'approach', inject: 'turn', salience: 4, detail: 'turn only' },
      ]),
    );
    expect(block).toContain('<origin');
    expect(block).toContain('<tone');
    expect(block).not.toContain('<approach');
  });

  it('uses full detail (never brief) at session start', () => {
    const block = buildSessionIdentityBlock(
      identity([
        {
          key: 'tone',
          inject: 'both',
          salience: 5,
          detail: 'the long canonical form',
          brief: 'short',
        },
      ]),
    );
    expect(block).toContain('the long canonical form');
    expect(block).not.toContain('>short<');
  });

  it('orders sections by salience descending and prefixes taboos with NEVER:', () => {
    const block = buildSessionIdentityBlock(
      identity([
        { key: 'origin', inject: 'session', salience: 1, detail: 'low' },
        { key: 'taboos', inject: 'both', salience: 5, detail: 'no deletes' },
      ]),
    );
    expect(block.indexOf('<taboos')).toBeLessThan(block.indexOf('<origin'));
    expect(block).toContain('<taboos salience="5">NEVER: no deletes</taboos>');
  });

  it('omits the role clause when role is absent and returns empty with no session sections', () => {
    const noRole = buildSessionIdentityBlock(
      identity([
        { key: 'origin', inject: 'session', salience: 1, detail: 'x' },
      ]),
    );
    expect(noRole).toContain('You are Nao.');
    expect(noRole).not.toContain('whose role is');
    const empty = buildSessionIdentityBlock(
      identity([
        { key: 'approach', inject: 'turn', salience: 4, detail: 'turn only' },
      ]),
    );
    expect(empty).toBe('');
  });
});
