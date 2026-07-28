import { bench, describe } from 'vitest';

import { validatePreToolUse } from '../../../hooks/preToolUse/helpers/preToolValidator/index.js';
import { guardStructure } from '../../../hooks/preToolUse/helpers/structureGuard/index.js';
import type { PreToolUseInput } from '../../../types/hooks.js';
import {
  generateClaudeMdContent,
  generateFilePath,
} from '../fixtures/generator.js';

// pre-tool-validator: INTENT.md 라인 수 스케일링
describe('scaling: pre-tool-validator line counts', () => {
  const lineCounts = [10, 25, 50, 75, 100, 150, 200, 500, 1000];

  for (const lineCount of lineCounts) {
    const content = generateClaudeMdContent(lineCount);
    const input: PreToolUseInput = {
      cwd: '/workspace',
      session_id: 'bench-session',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: {
        file_path: '/workspace/INTENT.md',
        content,
      },
    };

    bench(`line count: ${lineCount}`, () => {
      validatePreToolUse(input);
    });
  }
});

// structure-guard: 경로 깊이 스케일링
describe('scaling: structure-guard path depths', () => {
  const pathDepths = [2, 4, 6, 8, 10, 15, 20];

  for (const depth of pathDepths) {
    const filePath = generateFilePath({ depth, isOrgan: true });
    const input: PreToolUseInput = {
      cwd: '/workspace',
      session_id: 'bench-session',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: filePath },
    };

    bench(`path depth: ${depth}`, () => {
      guardStructure(input);
    });
  }
});

// 복합 스케일링: 여러 훅 동시 실행
describe('scaling: combined hook pipeline', () => {
  const tiers = [
    { label: 'minimal (10 lines, depth 2)', lineCount: 10, depth: 2 },
    { label: 'small (25 lines, depth 4)', lineCount: 25, depth: 4 },
    { label: 'medium (60 lines, depth 6)', lineCount: 60, depth: 6 },
    { label: 'large (95 lines, depth 10)', lineCount: 95, depth: 10 },
  ];

  for (const tier of tiers) {
    const claudeMdContent = generateClaudeMdContent(tier.lineCount);
    const claudeMdFilePath = generateFilePath({ depth: tier.depth });
    const organFilePath = generateFilePath({
      depth: tier.depth,
      isOrgan: true,
    });

    const preToolInput: PreToolUseInput = {
      cwd: '/workspace',
      session_id: 'bench-session',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: claudeMdFilePath, content: claudeMdContent },
    };

    const organInput: PreToolUseInput = {
      cwd: '/workspace',
      session_id: 'bench-session',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: organFilePath },
    };

    bench(tier.label, () => {
      validatePreToolUse(preToolInput);
      guardStructure(organInput);
    });
  }
});
