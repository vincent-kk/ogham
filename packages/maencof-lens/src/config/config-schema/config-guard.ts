/**
 * @file config-guard.ts
 * @description Lens Config 수동 타입 가드 (Zod-free)
 *
 * session-start hook에서 사용. Zod를 import하지 않아 hook 번들 크기를 보전한다.
 * 타입 정의는 config-schema.ts의 Zod 스키마와 동기화 유지할 것.
 */

import { CONFIG_VERSION, DEFAULT_LAYERS } from '../../constants/config.js';
import type { LensConfig, VaultConfig } from './config-schema.js';

/** Vault Config 최소 인터페이스 (hook용). */
export interface VaultConfigMinimal {
  name?: unknown;
  path?: unknown;
  layers?: unknown;
  default?: unknown;
}

/** Lens Config 최소 인터페이스 (hook용). */
export interface LensConfigMinimal {
  version?: unknown;
  vaults?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isValidLayer(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

function isValidVaultRaw(v: unknown): boolean {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  return isNonEmptyString(obj.name) && isNonEmptyString(obj.path);
}

/**
 * 수동 타입 가드: lens config-loader hook 경로에서 Zod 없이 config 형태를 검증.
 * Zod보다 관대한 superset이지만 (a) vaults 가 비어있으면 안 되고 (b) 각 vault에
 * name/path 가 있어야 한다는 zod 의 핵심 require 두 조건은 보존한다.
 * Zod 유효 → 수동 유효가 항상 성립.
 */
export function isValidLensConfig(raw: unknown): raw is LensConfigMinimal {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.vaults) || obj.vaults.length === 0) return false;
  return obj.vaults.every(isValidVaultRaw);
}

function normalizeLayers(v: unknown): number[] {
  if (!Array.isArray(v)) return [...DEFAULT_LAYERS];
  const filtered = v.filter(isValidLayer);
  return filtered.length > 0 ? filtered : [...DEFAULT_LAYERS];
}

function normalizeVault(raw: unknown): VaultConfig {
  const obj = raw as Record<string, unknown>;
  return {
    name: obj.name as string,
    path: obj.path as string,
    layers: normalizeLayers(obj.layers),
    default: typeof obj.default === 'boolean' ? obj.default : false,
  };
}

/**
 * 부분 필드 누락 시 기본값으로 채워주는 정규화 헬퍼.
 * Zod 스키마의 .default(...) 흐름을 수동으로 재현한다.
 * 호출 전 isValidLensConfig 로 형태를 보장해야 한다.
 */
export function normalizeLensConfig(raw: LensConfigMinimal): LensConfig {
  const obj = raw as Record<string, unknown>;
  const version = isNonEmptyString(obj.version) ? obj.version : CONFIG_VERSION;
  const vaults = (obj.vaults as unknown[]).map(normalizeVault);
  return { version, vaults };
}
