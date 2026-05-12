import { describe, it, expect } from 'vitest';
import { escapeJsonForHtml } from '../web-server/utils/escape-json-for-html.js';

describe('escapeJsonForHtml', () => {
  // --- basic ---

  it('plain object — base JSON 형식 유지', () => {
    expect(escapeJsonForHtml({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}');
  });

  it('< 문자 — \\u003c로 escape', () => {
    expect(escapeJsonForHtml('<')).toBe('"\\u003c"');
  });

  it('> 문자 — \\u003e로 escape', () => {
    expect(escapeJsonForHtml('>')).toBe('"\\u003e"');
  });

  // --- complex ---

  it('</script> XSS 페이로드 — script breakout 차단', () => {
    const evil = "</script><script>alert(1)</script>";
    const out = escapeJsonForHtml(evil);
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script\\u003e');
  });

  it('& 문자 — \\u0026로 escape (HTML entity 안전)', () => {
    expect(escapeJsonForHtml('&')).toBe('"\\u0026"');
  });

  it('U+2028 line separator — \\u2028로 escape (JS line terminator 회피)', () => {
    const ls = String.fromCharCode(0x2028);
    expect(escapeJsonForHtml(`a${ls}b`)).toBe('"a\\u2028b"');
  });

  it('U+2029 paragraph separator — \\u2029로 escape', () => {
    const ps = String.fromCharCode(0x2029);
    expect(escapeJsonForHtml(`a${ps}b`)).toBe('"a\\u2029b"');
  });

  it('중첩 객체의 username 필드에 </script> 삽입 — script breakout 차단', () => {
    const out = escapeJsonForHtml({ username: 'user</script>@x' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script\\u003e');
  });
});
