import { dirname, resolve } from 'node:path';

import type { ModuleInfo } from '../../../types/fractal.js';

import { findEntryPoint } from './find-entry-point.js';
import { extractImports } from './extract-imports.js';
import { extractPublicApi } from './extract-public-api.js';

/**
 * 모듈 디렉토리를 분석하여 ModuleInfo를 반환한다.
 *
 * @param modulePath - 모듈 디렉토리의 절대 경로
 * @returns 모듈 정보 (진입점, exports, imports, dependencies)
 */
export async function analyzeModule(modulePath: string): Promise<ModuleInfo> {
  const absPath = resolve(modulePath);
  const name = absPath.split('/').pop() ?? absPath;

  const entryPoint = await findEntryPoint(absPath);

  if (!entryPoint) {
    return {
      path: absPath,
      name,
      entryPoint: null,
      exports: [],
      imports: [],
      dependencies: [],
    };
  }

  const [publicApi, rawImports] = await Promise.all([
    extractPublicApi(entryPoint),
    extractImports(entryPoint),
  ]);

  const exportNames = publicApi.exports.map((e) => e.name);

  // import 경로를 절대 경로로 변환 (상대 경로만, node_modules 제외)
  const entryDir = dirname(entryPoint);
  const dependencies: string[] = [];
  const resolvedImports: string[] = [];

  for (const importPath of rawImports) {
    if (importPath.startsWith('.')) {
      // 상대 경로 → 절대 경로
      const resolved = resolve(entryDir, importPath);
      resolvedImports.push(resolved);
      dependencies.push(resolved);
    } else {
      // 외부 패키지는 imports에만 포함
      resolvedImports.push(importPath);
    }
  }

  return {
    path: absPath,
    name,
    entryPoint,
    exports: exportNames,
    imports: resolvedImports,
    dependencies,
  };
}
