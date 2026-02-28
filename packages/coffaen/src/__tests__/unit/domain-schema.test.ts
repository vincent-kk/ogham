/**
 * @file domain-schema.test.ts
 * @description DomainSchema Zod 스키마 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import { DomainSchema } from '../../types/domain.js';

describe('DomainSchema', () => {
  it('필수 필드만으로 파싱 성공한다', () => {
    const result = DomainSchema.safeParse({
      domain_name: 'AI 연구',
      domain_type: 'professional',
    });
    expect(result.success).toBe(true);
  });

  it('life 타입으로 파싱 성공한다', () => {
    const result = DomainSchema.safeParse({
      domain_name: '건강',
      domain_type: 'life',
      life_domain: 'health',
    });
    expect(result.success).toBe(true);
  });

  it('모든 선택 필드 포함 시 파싱 성공한다', () => {
    const result = DomainSchema.safeParse({
      domain_name: '소프트웨어 개발',
      domain_type: 'professional',
      professional_field: '백엔드',
      professional_role: '시니어 엔지니어',
      priority: 4,
      description: '주요 업무 영역',
    });
    expect(result.success).toBe(true);
  });

  describe('domain_type enum 검증', () => {
    it("domain_type 'life'는 유효하다", () => {
      const result = DomainSchema.safeParse({
        domain_name: '취미',
        domain_type: 'life',
      });
      expect(result.success).toBe(true);
    });

    it("domain_type 'professional'은 유효하다", () => {
      const result = DomainSchema.safeParse({
        domain_name: '커리어',
        domain_type: 'professional',
      });
      expect(result.success).toBe(true);
    });

    it('알 수 없는 domain_type은 실패한다', () => {
      const result = DomainSchema.safeParse({
        domain_name: '취미',
        domain_type: 'personal',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('life_domain enum 검증', () => {
    const validLifeDomains = [
      'health',
      'finance',
      'relationships',
      'career',
      'education',
      'hobby',
      'spirituality',
      'environment',
    ];

    for (const domain of validLifeDomains) {
      it(`life_domain '${domain}'은 유효하다`, () => {
        const result = DomainSchema.safeParse({
          domain_name: '테스트',
          domain_type: 'life',
          life_domain: domain,
        });
        expect(result.success).toBe(true);
      });
    }

    it('알 수 없는 life_domain은 실패한다', () => {
      const result = DomainSchema.safeParse({
        domain_name: '테스트',
        domain_type: 'life',
        life_domain: 'cooking',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('priority 범위 검증', () => {
    it('priority 1은 유효하다', () => {
      const result = DomainSchema.safeParse({
        domain_name: '테스트',
        domain_type: 'life',
        priority: 1,
      });
      expect(result.success).toBe(true);
    });

    it('priority 5는 유효하다', () => {
      const result = DomainSchema.safeParse({
        domain_name: '테스트',
        domain_type: 'professional',
        priority: 5,
      });
      expect(result.success).toBe(true);
    });

    it('priority 0은 실패한다 (min=1)', () => {
      const result = DomainSchema.safeParse({
        domain_name: '테스트',
        domain_type: 'life',
        priority: 0,
      });
      expect(result.success).toBe(false);
    });

    it('priority 6은 실패한다 (max=5)', () => {
      const result = DomainSchema.safeParse({
        domain_name: '테스트',
        domain_type: 'life',
        priority: 6,
      });
      expect(result.success).toBe(false);
    });

    it('priority 소수는 실패한다 (int 필수)', () => {
      const result = DomainSchema.safeParse({
        domain_name: '테스트',
        domain_type: 'life',
        priority: 2.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('domain_name 필드 검증', () => {
    it('빈 문자열 domain_name은 실패한다', () => {
      const result = DomainSchema.safeParse({
        domain_name: '',
        domain_type: 'life',
      });
      expect(result.success).toBe(false);
    });
  });
});
