/**
 * @file setup-wizard.test.ts
 * @description Setup 6단계 워크플로우 통합 테스트
 *
 * 시뮬레이션 흐름:
 * 1. welcome — 사용자 인사
 * 2. vault-path — vault 경로 설정
 * 3. core-identity-interview — Core Identity 인터뷰
 * 4. scaffold-tree — 디렉토리 구조 생성 + coffaen_create로 핵심 문서 생성
 * 5. index-build — kg_build로 인덱스 빌드
 * 6. guide — CLAUDE.md 통합
 */
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COFFAEN_END_MARKER,
  COFFAEN_START_MARKER,
  mergeCoffaenSection,
  readCoffaenSection,
} from '../../core/claude-md-merger.js';
import { handleCoffaenCreate } from '../../mcp/tools/coffaen-create.js';
import { handleKgBuild } from '../../mcp/tools/kg-build.js';
import { handleKgStatus } from '../../mcp/tools/kg-status.js';
import type { SetupProgress } from '../../types/setup.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'coffaen-setup-'));
}

describe('Setup Wizard 6단계 통합 테스트', () => {
  let vault: string;
  let progress: SetupProgress;

  beforeEach(async () => {
    vault = await makeTempVault();
    progress = {
      currentStep: 'welcome',
      completedSteps: [],
      interviewAnswers: {},
      startedAt: new Date().toISOString(),
      completed: false,
    };
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('Step 1: welcome — 진행 상태 초기화', () => {
    expect(progress.currentStep).toBe('welcome');
    expect(progress.completedSteps).toHaveLength(0);
    expect(progress.completed).toBe(false);

    // welcome 완료
    progress.completedSteps.push('welcome');
    progress.currentStep = 'vault-path';
    expect(progress.completedSteps).toContain('welcome');
  });

  it('Step 2: vault-path — vault 경로 설정', () => {
    progress.vaultPath = vault;
    progress.completedSteps.push('welcome', 'vault-path');
    progress.currentStep = 'core-identity-interview';

    expect(progress.vaultPath).toBe(vault);
    expect(progress.completedSteps).toContain('vault-path');
  });

  it('Step 3: core-identity-interview — 인터뷰 답변 수집', () => {
    progress.interviewAnswers = {
      name: '홍길동',
      role: '소프트웨어 엔지니어',
      goal: 'AI 기반 개인 지식 관리 시스템 구축',
      values: '효율성, 창의성, 지속적 학습',
    };
    progress.completedSteps.push(
      'welcome',
      'vault-path',
      'core-identity-interview',
    );
    progress.currentStep = 'scaffold-tree';

    expect(Object.keys(progress.interviewAnswers)).toHaveLength(4);
    expect(progress.interviewAnswers['name']).toBe('홍길동');
  });

  it('Step 4: scaffold-tree — 4개 Layer 디렉토리 + Core Identity 문서 생성', async () => {
    progress.vaultPath = vault;
    progress.interviewAnswers = { name: '홍길동', role: '소프트웨어 엔지니어' };

    // Core Identity 문서 생성 (Layer 1)
    const identityResult = await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity', 'core'],
      content: `이름: ${progress.interviewAnswers['name']}\n역할: ${progress.interviewAnswers['role']}`,
      title: 'Core Identity',
      filename: 'core-identity',
    });
    expect(identityResult.success).toBe(true);
    expect(identityResult.path).toMatch(/^01_Core\//);

    // 초기 메모 문서 생성 (Layer 2)
    const memoResult = await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['setup', 'initial'],
      content: 'Setup 완료 후 첫 번째 메모입니다.',
      title: 'Setup Complete',
      filename: 'setup-memo',
    });
    expect(memoResult.success).toBe(true);
    expect(memoResult.path).toMatch(/^02_Derived\//);

    // 디렉토리 구조 확인
    const dirs = await readdir(vault);
    expect(dirs).toContain('01_Core');
    expect(dirs).toContain('02_Derived');

    progress.completedSteps.push(
      'welcome',
      'vault-path',
      'core-identity-interview',
      'scaffold-tree',
    );
    progress.currentStep = 'autonomy-init';
  });

  it('Step 5: index-build — kg_build로 인덱스 빌드', async () => {
    progress.vaultPath = vault;

    // 문서 몇 개 생성
    await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity'],
      content: '핵심 정체성',
      title: 'Identity',
      filename: 'identity',
    });
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['derived', 'note'],
      content: '파생 메모',
      title: 'Derived Note',
      filename: 'derived-note',
    });
    await handleCoffaenCreate(vault, {
      layer: 3,
      tags: ['external', 'reference'],
      content: '외부 참고 자료',
      title: 'External Reference',
      filename: 'ext-ref',
      source: 'https://example.com',
    });

    // 인덱스 빌드
    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);
    expect(buildResult.nodeCount).toBeGreaterThanOrEqual(3);
    expect(buildResult.edgeCount).toBeGreaterThanOrEqual(0);
    expect(buildResult.durationMs).toBeGreaterThanOrEqual(0);

    // 상태 확인
    const statusResult = await handleKgStatus(vault, null, {});
    expect(statusResult.rebuildRecommended).toBe(true); // graph=null이므로

    progress.completedSteps.push(
      'welcome',
      'vault-path',
      'core-identity-interview',
      'scaffold-tree',
      'autonomy-init',
      'index-build',
    );
    progress.currentStep = 'guide';
  });

  it('Step 6: guide — CLAUDE.md에 coffaen 섹션 통합', async () => {
    const claudeMdPath = join(vault, 'CLAUDE.md');
    const coffaenGuide = `## coffaen 지식 트리

vault 경로: ${vault}

### 주요 명령
- \`kg_build\` — 인덱스 빌드
- \`kg_search\` — 지식 그래프 검색
- \`coffaen_create\` — 새 문서 생성

### Layer 구조
- Layer 1 (01_Core): 핵심 정체성
- Layer 2 (02_Derived): 파생 지식
- Layer 3 (03_External): 외부 정보
- Layer 4 (04_Action): 액션 아이템`;

    const mergeResult = mergeCoffaenSection(claudeMdPath, coffaenGuide, {
      dryRun: false,
    });
    expect(mergeResult.changed).toBe(true);
    expect(mergeResult.hadExistingSection).toBe(false);
    expect(mergeResult.content).toContain(COFFAEN_START_MARKER);
    expect(mergeResult.content).toContain(COFFAEN_END_MARKER);
    expect(mergeResult.content).toContain('coffaen 지식 트리');

    // 파일에서 섹션 읽기
    const readSection = readCoffaenSection(claudeMdPath);
    expect(readSection).toBeTruthy();
    expect(readSection).toContain('kg_build');
    expect(readSection).toContain('Layer 1');

    progress.completed = true;
    progress.completedAt = new Date().toISOString();
    expect(progress.completed).toBe(true);
  });

  it('전체 6단계 워크플로우 시뮬레이션', async () => {
    // Step 1-3: 설정
    progress.vaultPath = vault;
    progress.interviewAnswers = { name: '테스트 사용자', role: '개발자' };

    // Step 4: 문서 생성
    const createResults = await Promise.all([
      handleCoffaenCreate(vault, {
        layer: 1,
        tags: ['identity'],
        content: '핵심 정체성 문서',
        title: 'Identity',
        filename: 'identity',
      }),
      handleCoffaenCreate(vault, {
        layer: 2,
        tags: ['note'],
        content: '첫 번째 메모',
        title: 'First Note',
        filename: 'first-note',
      }),
    ]);
    expect(createResults.every((r) => r.success)).toBe(true);

    // Step 5: 인덱스 빌드
    const buildResult = await handleKgBuild(vault, { force: false });
    expect(buildResult.success).toBe(true);

    // Step 6: CLAUDE.md 통합
    const claudeMdPath = join(vault, 'CLAUDE.md');
    const mergeResult = mergeCoffaenSection(
      claudeMdPath,
      '## coffaen 활성화됨\n- vault: ' + vault,
    );
    expect(mergeResult.changed).toBe(true);

    // 완료 표시
    progress.completed = true;
    expect(progress.completed).toBe(true);
    expect(buildResult.nodeCount).toBeGreaterThanOrEqual(2);
  });
});
