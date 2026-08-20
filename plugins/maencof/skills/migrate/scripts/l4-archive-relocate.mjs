#!/usr/bin/env node
/**
 * @file l4-archive-relocate.mjs
 * @description Legacy L4 archive → 99_Archive/actions relocation tool for the
 * /maencof:migrate `l4-archive` option. Zero-dependency (node:fs / node:path /
 * node:util only, Node >= 20). Moves every markdown original under
 * `.maencof-meta/archive/04_Action/` to `99_Archive/actions/` (subdirectory
 * structure preserved) and rewrites the legacy `archive_path` prefix inside
 * in-place stubs (frontmatter and body callout). Default mode is a dry-run
 * that never writes. No WAL — rollback is git (single-commit design; the
 * skill's Preflight requires a clean tree).
 *
 * Exit codes: 0 ok · 1 execution failure · 2 input/precondition error ·
 * 3 collision (move target already exists).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { parseArgs } from 'node:util';

const LEGACY_PREFIX = '.maencof-meta/archive/04_Action/';
const NEW_PREFIX = '99_Archive/actions/';
const ACTION_LAYER = '04_Action';

/** 재귀 walk — rootAbs 하위 `.md` 의 posix 상대 경로 목록. 루트 부재 시 빈 배열. */
function listMarkdown(rootAbs) {
  const found = [];
  const walk = (dirAbs) => {
    let entries;
    try {
      entries = readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dirAbs, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.md'))
        found.push(
          abs
            .slice(rootAbs.length + 1)
            .split(sep)
            .join('/'),
        );
    }
  };
  walk(rootAbs);
  return found;
}

function stripQuotes(v) {
  if (
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
  )
    return v.slice(1, -1);
  return v;
}

/**
 * 단일행 `key: value` frontmatter 파서 (publication-migrate 와 동형). 그 외
 * 형식은 null — 호출자가 비대상으로 스킵한다. 값은 원문 문자열 그대로 보존한다.
 */
function parseFrontmatter(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  if (lines[0] !== '---') return null;
  const fields = new Map();
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') return fields;
    const m = /^([A-Za-z_][A-Za-z0-9_-]*): ?(.*)$/.exec(lines[i]);
    if (!m) return null;
    fields.set(m[1], m[2]);
  }
  return null;
}

/**
 * 읽기 전용 계획 수립 — 이동(moves)·스텁 재작성(stubRewrites)·anomaly·collision.
 * anomaly: legacy 접두 스텁인데 정본이 양 루트 어디에도 없음, 또는 archived
 * 스텁에 archive_path 부재. 이미 신규 접두인 스텁과 live 문서는 비대상.
 */
function plan(vaultAbs) {
  const moves = [];
  const collisions = [];
  for (const rel of listMarkdown(join(vaultAbs, ...LEGACY_PREFIX.split('/')))) {
    const targetAbs = join(
      vaultAbs,
      ...NEW_PREFIX.split('/'),
      ...rel.split('/'),
    );
    const move = { from: `${LEGACY_PREFIX}${rel}`, to: `${NEW_PREFIX}${rel}` };
    if (existsSync(targetAbs)) collisions.push(move);
    else moves.push(move);
  }

  const stubRewrites = [];
  const anomalies = [];
  for (const rel of listMarkdown(join(vaultAbs, ACTION_LAYER))) {
    const stubRel = `${ACTION_LAYER}/${rel}`;
    const fields = parseFrontmatter(
      readFileSync(join(vaultAbs, ACTION_LAYER, ...rel.split('/')), 'utf-8'),
    );
    if (!fields || stripQuotes(fields.get('archived') ?? '') !== 'true')
      continue;
    const archivePath = stripQuotes(fields.get('archive_path') ?? '');
    if (archivePath === '') {
      anomalies.push({
        path: stubRel,
        reason: 'archived stub without archive_path',
      });
      continue;
    }
    if (!archivePath.startsWith(LEGACY_PREFIX)) continue; // 이미 신규 접두 또는 외부 체계
    const originalRel = archivePath.slice(LEGACY_PREFIX.length);
    const inLegacy = existsSync(
      join(vaultAbs, ...LEGACY_PREFIX.split('/'), ...originalRel.split('/')),
    );
    const inNew = existsSync(
      join(vaultAbs, ...NEW_PREFIX.split('/'), ...originalRel.split('/')),
    );
    if (!inLegacy && !inNew) {
      anomalies.push({
        path: stubRel,
        reason: 'original missing in both roots',
      });
      continue;
    }
    stubRewrites.push({ path: stubRel });
  }

  return { moves, stubRewrites, anomalies, collisions };
}

/** 빈 디렉토리를 후위 재귀로 제거한다 (best-effort — 비-md 잔존물이 있으면 남긴다). */
function removeEmptyDirs(dirAbs) {
  let entries;
  try {
    entries = readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries)
    if (entry.isDirectory()) removeEmptyDirs(join(dirAbs, entry.name));
  try {
    if (readdirSync(dirAbs).length === 0) rmdirSync(dirAbs);
  } catch {
    /* 잔존물 있음 — 남긴다 */
  }
}

/** 계획 실행 — 이동 → 스텁 접두 치환 → legacy 빈 디렉토리 정리. */
function execute(vaultAbs, thePlan) {
  let moved = 0;
  for (const move of thePlan.moves) {
    const fromAbs = join(vaultAbs, ...move.from.split('/'));
    const toAbs = join(vaultAbs, ...move.to.split('/'));
    if (existsSync(toAbs)) return { collision: move }; // 실행 직전 재체크
    mkdirSync(dirname(toAbs), { recursive: true });
    renameSync(fromAbs, toAbs);
    moved++;
  }

  let rewritten = 0;
  for (const rewrite of thePlan.stubRewrites) {
    const abs = join(vaultAbs, ...rewrite.path.split('/'));
    const content = readFileSync(abs, 'utf-8');
    const next = content.replaceAll(LEGACY_PREFIX, NEW_PREFIX);
    if (next !== content) {
      writeFileSync(abs, next, 'utf-8');
      rewritten++;
    }
  }

  const legacyRootAbs = join(vaultAbs, ...LEGACY_PREFIX.split('/'));
  const leftover = listMarkdown(legacyRootAbs);
  if (leftover.length > 0)
    return { error: `legacy root still holds ${leftover.length} .md file(s)` };
  removeEmptyDirs(legacyRootAbs);

  return { moved, rewritten };
}

function emit(payload) {
  console.log(JSON.stringify(payload));
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      execute: { type: 'boolean', default: false },
      report: { type: 'string' },
    },
  });
  const vaultAbs = positionals[0];
  if (!vaultAbs || !existsSync(vaultAbs)) {
    console.error(
      'usage: l4-archive-relocate.mjs <vaultPath> [--execute] [--report <file>]',
    );
    process.exit(2);
  }
  if (
    !existsSync(join(vaultAbs, '.maencof')) &&
    !existsSync(join(vaultAbs, '.maencof-meta'))
  ) {
    console.error(
      `not a maencof vault (no .maencof/.maencof-meta): ${vaultAbs}`,
    );
    process.exit(2);
  }

  const thePlan = plan(vaultAbs);
  if (values.report) {
    mkdirSync(dirname(values.report), { recursive: true });
    writeFileSync(values.report, JSON.stringify(thePlan, null, 2), 'utf-8');
  }
  const base = {
    moves: thePlan.moves.length,
    stubRewrites: thePlan.stubRewrites.length,
    anomalies: thePlan.anomalies,
    collisions: thePlan.collisions,
  };

  if (!values.execute) {
    console.error(
      `[dry-run] moves=${base.moves} stubRewrites=${base.stubRewrites} anomalies=${thePlan.anomalies.length} collisions=${thePlan.collisions.length}`,
    );
    emit({ mode: 'dry-run', ...base });
    process.exit(0);
  }

  if (thePlan.collisions.length > 0) {
    for (const c of thePlan.collisions)
      console.error(`collision: ${c.from} -> ${c.to}`);
    process.exit(3);
  }
  const result = execute(vaultAbs, thePlan);
  if (result.collision) {
    console.error(
      `collision: ${result.collision.from} -> ${result.collision.to} — partial state, restore with git`,
    );
    process.exit(3);
  }
  if (result.error) {
    console.error(`execution failed: ${result.error} — restore with git`);
    process.exit(1);
  }
  console.error(
    `[execute] moved=${result.moved} rewritten=${result.rewritten} anomalies=${thePlan.anomalies.length}`,
  );
  emit({
    mode: 'execute',
    moved: result.moved,
    rewritten: result.rewritten,
    ...base,
  });
  process.exit(0);
}

main();
