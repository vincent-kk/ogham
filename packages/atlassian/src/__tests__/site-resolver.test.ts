import { describe, it, expect, vi } from 'vitest';
import { resolveSiteConfig } from '../utils/site-resolver.js';
import type { ServiceConfig } from '../types/index.js';

function makeSite(base_url: string, is_cloud = true): ServiceConfig {
  return { base_url, is_cloud, ssl_verify: true, timeout: 30000 };
}

describe('resolveSiteConfig', () => {
  // --- basic ---

  it('단일 사이트 — 자동 선택', () => {
    const sites = [makeSite('https://a.atlassian.net')];
    const result = resolveSiteConfig('jira', sites);
    expect(result.base_url).toBe('https://a.atlassian.net');
  });

  it('빈 배열 — 에러', () => {
    expect(() => resolveSiteConfig('jira', [])).toThrow(/No jira sites configured/);
  });

  it('explicit baseUrl 매칭', () => {
    const sites = [
      makeSite('https://a.atlassian.net'),
      makeSite('https://b.atlassian.net'),
    ];
    const result = resolveSiteConfig('jira', sites, 'https://b.atlassian.net');
    expect(result.base_url).toBe('https://b.atlassian.net');
  });

  // --- complex ---

  it('absolute URL endpoint에서 hostname 추출하여 매칭', () => {
    const sites = [
      makeSite('https://a.atlassian.net'),
      makeSite('https://b.atlassian.net'),
    ];
    const result = resolveSiteConfig('jira', sites, undefined, 'https://b.atlassian.net/rest/api/3/issue/PROJ-1');
    expect(result.base_url).toBe('https://b.atlassian.net');
  });

  it('다중 사이트 + 미지정 — 에러', () => {
    const sites = [
      makeSite('https://a.atlassian.net'),
      makeSite('https://b.atlassian.net'),
    ];
    expect(() => resolveSiteConfig('jira', sites)).toThrow(/Multiple jira sites configured/);
  });

  it('등록되지 않은 baseUrl — 에러', () => {
    const sites = [makeSite('https://a.atlassian.net')];
    expect(() => resolveSiteConfig('jira', sites, 'https://unknown.atlassian.net')).toThrow(/site not found/);
  });

  it('등록되지 않은 endpoint hostname — 에러', () => {
    const sites = [makeSite('https://a.atlassian.net')];
    expect(() => resolveSiteConfig('jira', sites, undefined, 'https://unknown.atlassian.net/rest/api/3/issue')).toThrow(/site not found/);
  });

  it('Cloud+OnPrem 혼합 — console.warn 출력', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sites = [
      makeSite('https://a.atlassian.net', true),
      makeSite('https://jira.internal.com', false),
    ];
    resolveSiteConfig('jira', sites, 'https://a.atlassian.net');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('mixing Cloud and On-Prem'));
    warnSpy.mockRestore();
  });

  it('baseUrl 우선순위가 endpoint보다 높음', () => {
    const sites = [
      makeSite('https://a.atlassian.net'),
      makeSite('https://b.atlassian.net'),
    ];
    const result = resolveSiteConfig('jira', sites, 'https://a.atlassian.net', 'https://b.atlassian.net/rest/api/3/issue');
    expect(result.base_url).toBe('https://a.atlassian.net');
  });
});
