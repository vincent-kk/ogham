import { describe, expect, it } from 'vitest';

import { mapReplacer, toolError, toolResult, wrapHandler } from '../mcp/shared/shared.js';

describe('MCP shared utilities', () => {
  describe('toolResult', () => {
    it('should wrap result as MCP text content', () => {
      const res = toolResult({ status: 'ok' });
      expect(res.content).toHaveLength(1);
      expect(res.content[0].type).toBe('text');
      expect(JSON.parse(res.content[0].text)).toEqual({ status: 'ok' });
    });
  });

  describe('toolError', () => {
    it('should wrap Error as MCP error content', () => {
      const res = toolError(new Error('fail'));
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toBe('Error: fail');
    });

    it('should wrap string as MCP error content', () => {
      const res = toolError('something broke');
      expect(res.content[0].text).toBe('Error: something broke');
    });
  });

  describe('mapReplacer', () => {
    it('should convert Map to plain object', () => {
      const map = new Map([['a', 1]]);
      const result = JSON.parse(JSON.stringify(map, mapReplacer));
      expect(result).toEqual({ a: 1 });
    });

    it('should convert Set to array', () => {
      const set = new Set([1, 2, 3]);
      const result = JSON.parse(JSON.stringify(set, mapReplacer));
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('wrapHandler', () => {
    it('wraps successful result in toolResult', async () => {
      const handler = async () => ({ status: 'ok' });
      const wrapped = wrapHandler(handler);
      const res = await wrapped({});
      expect(res.content[0].type).toBe('text');
      expect(JSON.parse(res.content[0].text)).toEqual({ status: 'ok' });
      expect((res as { isError?: boolean }).isError).toBeUndefined();
    });

    it('catches thrown errors and returns toolError', async () => {
      const handler = async () => {
        throw new Error('handler failed');
      };
      const wrapped = wrapHandler(handler);
      const res = await wrapped({});
      expect((res as { isError?: boolean }).isError).toBe(true);
      expect(res.content[0].text).toBe('Error: handler failed');
    });

    it('with checkErrorField: true detects error field in result', async () => {
      const handler = async () => ({ error: 'napi unavailable', sgLoadError: '' });
      const wrapped = wrapHandler(handler, { checkErrorField: true });
      const res = await wrapped({});
      expect((res as { isError?: boolean }).isError).toBeUndefined();
      expect(res.content[0].text).toBe('napi unavailable');
    });

    it('with checkErrorField: false ignores error field in result', async () => {
      const handler = async () => ({ error: 'napi unavailable' });
      const wrapped = wrapHandler(handler, { checkErrorField: false });
      const res = await wrapped({});
      expect((res as { isError?: boolean }).isError).toBeUndefined();
      expect(JSON.parse(res.content[0].text)).toEqual({ error: 'napi unavailable' });
    });
  });
});
