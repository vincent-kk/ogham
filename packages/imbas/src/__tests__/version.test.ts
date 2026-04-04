import { describe, expect, it } from 'vitest';

import { VERSION } from '../version.js';

describe('VERSION', () => {
  it('should be a valid semver string', () => {
    expect(VERSION).toMatch(
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/,
    );
  });
});
