/**
 * @file peer-file-registry.ts
 * @description Zero Peer File 규칙에서 사용하는 상수 레지스트리.
 *
 * fractal-tree.ts(스캐너)와 rule-engine.ts(규칙) 모두에서 참조하므로
 * 별도 모듈로 분리하여 의존 방향을 유지한다.
 */

/** Fractal root에서 항상 허용되는 파일 목록 (entry point + 문서). */
export const ALLOWED_FRACTAL_ROOT_FILES = new Set([
  'index.ts',
  'index.js',
  'index.tsx',
  'index.mjs',
  'index.cjs',
  'main.ts',
  'main.js',
  'INTENT.md',
  'DETAIL.md',
]);

/** Framework별 예약 파일 목록. package.json 의존성에서 프레임워크를 감지하여 적용한다. */
export const FRAMEWORK_RESERVED_FILES: Record<string, string[]> = {
  next: [
    'layout.tsx',
    'layout.ts',
    'layout.js',
    'page.tsx',
    'page.ts',
    'page.js',
    'loading.tsx',
    'loading.ts',
    'error.tsx',
    'error.ts',
    'not-found.tsx',
    'not-found.ts',
    'template.tsx',
    'template.ts',
    'default.tsx',
    'default.ts',
    'route.ts',
    'route.js',
    'middleware.ts',
    'middleware.js',
    'opengraph-image.tsx',
    'opengraph-image.ts',
  ],
  remix: ['root.tsx', 'root.ts', 'entry.client.tsx', 'entry.server.tsx'],
  nuxt: ['app.vue', 'error.vue', 'app.config.ts'],
  sveltekit: [
    '+page.svelte',
    '+page.ts',
    '+page.js',
    '+page.server.ts',
    '+page.server.js',
    '+layout.svelte',
    '+layout.ts',
    '+layout.js',
    '+layout.server.ts',
    '+layout.server.js',
    '+error.svelte',
    '+server.ts',
    '+server.js',
  ],
};

/** package.json 의존성 이름 → 프레임워크 식별자 매핑. */
export const FRAMEWORK_PACKAGES: Record<string, string> = {
  next: 'next',
  remix: 'remix',
  '@remix-run/react': 'remix',
  '@remix-run/node': 'remix',
  nuxt: 'nuxt',
  '@sveltejs/kit': 'sveltekit',
};
