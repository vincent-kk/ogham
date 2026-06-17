import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../logger.js';

describe('logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    delete process.env.CENNAD_DEBUG;
  });

  it('writes info messages to stderr with [cennad] prefix', () => {
    logger.info('hello');
    expect(stderrSpy).toHaveBeenCalledWith('[cennad] [info] hello\n');
  });

  it('includes JSON meta when provided', () => {
    logger.warn('mismatch', { expected: 1, got: 2 });
    expect(stderrSpy).toHaveBeenCalledWith(
      '[cennad] [warn] mismatch {"expected":1,"got":2}\n',
    );
  });

  it('suppresses debug by default', () => {
    logger.debug('ignored');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('emits debug when CENNAD_DEBUG is set', () => {
    process.env.CENNAD_DEBUG = '1';
    logger.debug('visible');
    expect(stderrSpy).toHaveBeenCalledWith('[cennad] [debug] visible\n');
  });
});
