import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
});

const { existsSync, mkdirSync, appendFileSync } = await import('node:fs');
const { createLogger, setLogDir, resetLogger } =
  await import('../../../lib/logger.js');

describe('createLogger', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    resetLogger();
    vi.mocked(appendFileSync).mockClear();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mkdirSync).mockClear();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    delete process.env['FILID_DEBUG'];
  });

  it('debug() outputs nothing when FILID_DEBUG is unset', () => {
    const log = createLogger('test');
    log.debug('hello');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('debug() outputs tagged message to stderr when FILID_DEBUG=1', () => {
    process.env['FILID_DEBUG'] = '1';
    const log = createLogger('test');
    log.debug('hello world');
    expect(errorSpy).toHaveBeenCalledWith('[filid:test]', 'hello world');
  });

  it('error() outputs nothing when FILID_DEBUG is unset', () => {
    const log = createLogger('test');
    log.error('fail');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('error() outputs tagged message to stderr when FILID_DEBUG=1', () => {
    process.env['FILID_DEBUG'] = '1';
    const log = createLogger('cache');
    log.error('something broke', new Error('boom'));
    expect(errorSpy).toHaveBeenCalledWith(
      '[filid:cache]',
      'something broke',
      expect.any(Error),
    );
  });

  it('never throws even if console.error throws', () => {
    process.env['FILID_DEBUG'] = '1';
    errorSpy.mockImplementation(() => {
      throw new Error('stderr broken');
    });
    const log = createLogger('test');
    expect(() => log.debug('should not throw')).not.toThrow();
    expect(() => log.error('should not throw')).not.toThrow();
  });

  it('multiple createLogger calls produce distinct component tags', () => {
    process.env['FILID_DEBUG'] = '1';
    const logA = createLogger('cache');
    const logB = createLogger('setup');
    logA.debug('msg a');
    logB.debug('msg b');
    expect(errorSpy).toHaveBeenCalledWith('[filid:cache]', 'msg a');
    expect(errorSpy).toHaveBeenCalledWith('[filid:setup]', 'msg b');
  });

  it('writes to debug.log file when logDir is set and FILID_DEBUG=1', () => {
    process.env['FILID_DEBUG'] = '1';
    setLogDir('/tmp/test-cache');
    const log = createLogger('cache');
    log.debug('file test');
    expect(appendFileSync).toHaveBeenCalledWith(
      '/tmp/test-cache/debug.log',
      expect.stringContaining('[filid:cache] file test'),
    );
  });

  it('does not write to file when logDir is not set', () => {
    process.env['FILID_DEBUG'] = '1';
    const log = createLogger('cache');
    log.debug('no file');
    expect(appendFileSync).not.toHaveBeenCalled();
  });

  it('does not write to file when FILID_DEBUG is unset', () => {
    setLogDir('/tmp/test-cache');
    const log = createLogger('cache');
    log.debug('should not write');
    expect(appendFileSync).not.toHaveBeenCalled();
  });
});
