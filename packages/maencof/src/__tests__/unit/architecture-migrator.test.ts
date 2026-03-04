import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  checkArchitectureVersion,
  classifyL3Document,
  executeMigration,
  planMigration,
  rollbackMigration,
} from '../../core/architecture-migrator.js';
import { EXPECTED_ARCHITECTURE_VERSION } from '../../types/common.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'v1-vault');

describe('architecture-migrator', () => {
  let testVault: string;

  beforeEach(() => {
    testVault = join(tmpdir(), `maencof-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    cpSync(FIXTURES_DIR, testVault, { recursive: true });
  });

  afterEach(() => {
    rmSync(testVault, { recursive: true, force: true });
  });

  describe('classifyL3Document', () => {
    it('person 필드가 있으면 relational로 분류한다', () => {
      const fm = { person: { name: 'Alice' }, layer: 3 };
      expect(classifyL3Document(fm, ['friend'])).toBe('relational');
    });

    it('person_ref 필드가 있으면 relational로 분류한다', () => {
      const fm = { person_ref: 'Alice', layer: 3 };
      expect(classifyL3Document(fm, [])).toBe('relational');
    });

    it('org_type 필드가 있으면 structural로 분류한다', () => {
      const fm = { org_type: 'company', layer: 3 };
      expect(classifyL3Document(fm, ['work'])).toBe('structural');
    });

    it('person 태그가 있으면 relational로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['person', 'networking'])).toBe(
        'relational',
      );
    });

    it('friend 태그가 있으면 relational로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['friend'])).toBe('relational');
    });

    it('colleague 태그가 있으면 relational로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['colleague'])).toBe('relational');
    });

    it('mentor 태그가 있으면 relational로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['mentor'])).toBe('relational');
    });

    it('company 태그가 있으면 structural로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['company', 'work'])).toBe('structural');
    });

    it('organization 태그가 있으면 structural로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['organization'])).toBe('structural');
    });

    it('team 태그가 있으면 structural로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['team'])).toBe('structural');
    });

    it('community 태그가 있으면 structural로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['community'])).toBe('structural');
    });

    it('태그 대소문자를 무시한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['PERSON'])).toBe('relational');
      expect(classifyL3Document(fm, ['Company'])).toBe('structural');
    });

    it('해당 없으면 topical로 분류한다', () => {
      const fm = { layer: 3 };
      expect(classifyL3Document(fm, ['react', 'programming'])).toBe('topical');
    });

    it('person 필드가 org_type보다 우선한다', () => {
      const fm = { person: { name: 'Bob' }, org_type: 'company', layer: 3 };
      expect(classifyL3Document(fm, [])).toBe('relational');
    });

    it('빈 태그와 빈 frontmatter는 topical이다', () => {
      expect(classifyL3Document({}, [])).toBe('topical');
    });
  });

  describe('checkArchitectureVersion', () => {
    it('v1 vault는 마이그레이션이 필요하다', () => {
      const result = checkArchitectureVersion(testVault);
      expect(result.current).toBe('1.0.0');
      expect(result.expected).toBe(EXPECTED_ARCHITECTURE_VERSION);
      expect(result.needsMigration).toBe(true);
    });

    it('version.json이 없으면 1.0.0으로 기본값 처리한다', () => {
      rmSync(join(testVault, '.maencof-meta', 'version.json'));
      const result = checkArchitectureVersion(testVault);
      expect(result.current).toBe('1.0.0');
      expect(result.needsMigration).toBe(true);
    });

    it('이미 v2면 마이그레이션 불필요하다', () => {
      const versionPath = join(testVault, '.maencof-meta', 'version.json');
      const data = JSON.parse(readFileSync(versionPath, 'utf-8'));
      data.architecture_version = EXPECTED_ARCHITECTURE_VERSION;
      writeFileSync(versionPath, JSON.stringify(data, null, 2));

      const result = checkArchitectureVersion(testVault);
      expect(result.needsMigration).toBe(false);
    });
  });

  describe('planMigration', () => {
    it('side-effect 없이 계획을 생성한다', () => {
      const plan = planMigration(testVault);
      expect(plan.currentVersion).toBe('1.0.0');
      expect(plan.targetVersion).toBe(EXPECTED_ARCHITECTURE_VERSION);
      expect(plan.operations.length).toBeGreaterThan(0);
      expect(plan.summary.dirsToCreate).toBeGreaterThanOrEqual(5); // 3 L3 + 2 L5
      expect(plan.summary.filesToMove).toBe(3); // alice, company-x, react-hooks

      // 파일이 실제로 이동되지 않았음을 확인
      expect(existsSync(join(testVault, '03_External', 'alice.md'))).toBe(true);
    });

    it('L3 문서 3개를 올바른 서브디렉토리로 분류한다', () => {
      const plan = planMigration(testVault);
      const moveOps = plan.operations.filter((o) => o.type === 'move_file');

      const aliceMove = moveOps.find(
        (o) => o.type === 'move_file' && o.from.endsWith('alice.md'),
      );
      expect(aliceMove).toBeDefined();
      if (aliceMove && aliceMove.type === 'move_file') {
        expect(aliceMove.to).toContain('relational');
      }

      const companyMove = moveOps.find(
        (o) => o.type === 'move_file' && o.from.endsWith('company-x.md'),
      );
      expect(companyMove).toBeDefined();
      if (companyMove && companyMove.type === 'move_file') {
        expect(companyMove.to).toContain('structural');
      }

      const reactMove = moveOps.find(
        (o) => o.type === 'move_file' && o.from.endsWith('react-hooks.md'),
      );
      expect(reactMove).toBeDefined();
      if (reactMove && reactMove.type === 'move_file') {
        expect(reactMove.to).toContain('topical');
      }
    });

    it('frontmatter 업데이트 작업을 포함한다', () => {
      const plan = planMigration(testVault);
      const fmOps = plan.operations.filter(
        (o) => o.type === 'update_frontmatter',
      );
      expect(fmOps.length).toBe(3);
      for (const op of fmOps) {
        if (op.type === 'update_frontmatter') {
          expect(op.field).toBe('sub_layer');
        }
      }
    });

    it('버전 업데이트 작업을 포함한다', () => {
      const plan = planMigration(testVault);
      const versionOps = plan.operations.filter(
        (o) => o.type === 'update_version',
      );
      expect(versionOps.length).toBe(1);
    });
  });

  describe('executeMigration', () => {
    it('WAL 기반으로 마이그레이션을 실행한다', () => {
      const plan = planMigration(testVault);
      const result = executeMigration(testVault, plan);

      expect(result.success).toBe(true);
      expect(result.operationsExecuted).toBe(plan.operations.length);
      expect(result.operationsFailed).toBe(0);

      // 서브디렉토리 생성 확인
      expect(existsSync(join(testVault, '03_External', 'relational'))).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'structural'))).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'topical'))).toBe(true);
      expect(existsSync(join(testVault, '05_Context', 'buffer'))).toBe(true);
      expect(existsSync(join(testVault, '05_Context', 'boundary'))).toBe(true);

      // 파일 이동 확인
      expect(
        existsSync(join(testVault, '03_External', 'relational', 'alice.md')),
      ).toBe(true);
      expect(
        existsSync(join(testVault, '03_External', 'structural', 'company-x.md')),
      ).toBe(true);
      expect(
        existsSync(join(testVault, '03_External', 'topical', 'react-hooks.md')),
      ).toBe(true);

      // 원본 위치에서 제거 확인
      expect(existsSync(join(testVault, '03_External', 'alice.md'))).toBe(false);
    });

    it('WAL 파일이 생성된다', () => {
      const plan = planMigration(testVault);
      executeMigration(testVault, plan);

      const walPath = join(testVault, '.maencof-meta', 'migration-wal.json');
      expect(existsSync(walPath)).toBe(true);

      const wal = JSON.parse(readFileSync(walPath, 'utf-8'));
      expect(wal.status).toBe('completed');
      expect(wal.operations.every((o: { status: string }) => o.status === 'done')).toBe(true);
    });

    it('아키텍처 버전이 업데이트된다', () => {
      const plan = planMigration(testVault);
      executeMigration(testVault, plan);

      const versionPath = join(testVault, '.maencof-meta', 'version.json');
      const data = JSON.parse(readFileSync(versionPath, 'utf-8'));
      expect(data.architecture_version).toBe(EXPECTED_ARCHITECTURE_VERSION);
    });

    it('frontmatter에 sub_layer가 추가된다', () => {
      const plan = planMigration(testVault);
      executeMigration(testVault, plan);

      const aliceContent = readFileSync(
        join(testVault, '03_External', 'relational', 'alice.md'),
        'utf-8',
      );
      expect(aliceContent).toContain('sub_layer: relational');
    });
  });

  describe('rollbackMigration', () => {
    it('실행된 마이그레이션을 롤백한다', () => {
      const plan = planMigration(testVault);
      executeMigration(testVault, plan);

      // 마이그레이션 완료 확인
      expect(
        existsSync(join(testVault, '03_External', 'relational', 'alice.md')),
      ).toBe(true);

      const result = rollbackMigration(testVault);
      expect(result.success).toBe(true);
      expect(result.rolledBack).toBeGreaterThan(0);

      // 파일이 원래 위치로 돌아왔는지 확인
      expect(existsSync(join(testVault, '03_External', 'alice.md'))).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'company-x.md'))).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'react-hooks.md'))).toBe(true);
    });

    it('WAL 파일이 없으면 에러를 반환한다', () => {
      const result = rollbackMigration(testVault);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No WAL file found');
    });

    it('롤백 후 WAL 상태가 rolled_back이다', () => {
      const plan = planMigration(testVault);
      executeMigration(testVault, plan);
      rollbackMigration(testVault);

      const walPath = join(testVault, '.maencof-meta', 'migration-wal.json');
      const wal = JSON.parse(readFileSync(walPath, 'utf-8'));
      expect(wal.status).toBe('rolled_back');
    });
  });

  describe('L3 없는 vault', () => {
    it('L3 문서 없이도 빈 서브디렉토리를 생성한다', () => {
      // L3 문서 제거
      rmSync(join(testVault, '03_External', 'alice.md'));
      rmSync(join(testVault, '03_External', 'company-x.md'));
      rmSync(join(testVault, '03_External', 'react-hooks.md'));

      const plan = planMigration(testVault);
      expect(plan.summary.filesToMove).toBe(0);
      expect(plan.summary.dirsToCreate).toBeGreaterThanOrEqual(5);

      const result = executeMigration(testVault, plan);
      expect(result.success).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'relational'))).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'structural'))).toBe(true);
      expect(existsSync(join(testVault, '03_External', 'topical'))).toBe(true);
    });
  });
});
