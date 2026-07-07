import { existsSync } from 'node:fs';
import * as path from 'node:path';

import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isDetailMd, isIntentMd } from '../../../shared/shared.js';
import { checkCircularImports } from '../../../utils/checkCircularImports.js';
import { checkIntentMdReclassification } from '../../../utils/checkIntentMdReclassification.js';
import { checkOrganSubdirectory } from '../../../utils/checkOrganSubdirectory.js';
import { getParentSegments } from '../../../utils/getParentSegments.js';
import { validateCwd } from '../../../utils/validateCwd.js';

export function guardStructure(input: PreToolUseInput): HookOutput {
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit')
    return { continue: true };

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!filePath) return { continue: true };

  const cwd = validateCwd(input.cwd);
  if (cwd === null) return { continue: true };
  const segments = getParentSegments(filePath, cwd);
  const content = input.tool_input.content ?? input.tool_input.new_string ?? '';

  const info = checkIntentMdReclassification(
    input.tool_name,
    filePath,
    cwd,
    segments,
  );
  // Organ-nesting is a CREATION concern: editing an existing file, or writing
  // the INTENT.md/DETAIL.md that itself declares the sub-fractal, is not
  // "creating a subdirectory inside an organ".
  const absFile = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(cwd, filePath);
  const creationTarget =
    !existsSync(absFile) && !isIntentMd(filePath) && !isDetailMd(filePath);
  const warnings = [
    ...(creationTarget ? checkOrganSubdirectory(segments, cwd) : []),
    ...checkCircularImports(filePath, content, cwd),
  ];

  if (warnings.length === 0 && info.length === 0) return { continue: true };

  const parts: string[] = [];
  if (info.length > 0)
    parts.push(
      `[filid:info] structure-guard:\n` +
        info.map((m, i) => `${i + 1}. ${m}`).join('\n'),
    );

  if (warnings.length > 0)
    parts.push(
      `[filid:warn] structure-guard:\n` +
        warnings.map((w, i) => `${i + 1}. ${w}`).join('\n'),
    );

  return {
    continue: true,
    hookSpecificOutput: { additionalContext: parts.join('\n\n') },
  };
}
