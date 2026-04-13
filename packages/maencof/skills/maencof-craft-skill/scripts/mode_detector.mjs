#!/usr/bin/env node
/**
 * Mode Detector - Determines CREATE/REFACTOR/IMPROVE/FIX from context
 *
 * Usage:
 *     node mode_detector.mjs --request "user request text" [--skill-path <path>]
 *
 * Output:
 *     JSON: {"mode": "CREATE", "confidence": 0.95, "reasons": [...]}
 */

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';

const Mode = Object.freeze({
  CREATE: 'CREATE',
  REFACTOR: 'REFACTOR',
  IMPROVE: 'IMPROVE',
  FIX: 'FIX',
});

// Weighted keyword definitions: [keyword, weight]
const KEYWORD_WEIGHTS = {
  [Mode.CREATE]: [
    ['create', 3], ['new skill', 4], ['build', 2], ['initialize', 3],
    ['start', 1], ['from scratch', 4], ['make a skill', 3], ['generate', 2],
  ],
  [Mode.REFACTOR]: [
    ['refactor', 4], ['restructure', 4], ['reorganize', 3], ['clean up structure', 3],
    ['split', 2], ['extract', 2], ['simplify structure', 3], ['slim down', 2],
  ],
  [Mode.IMPROVE]: [
    ['improve', 3], ['enhance', 3], ['add feature', 4], ['extend', 2],
    ['upgrade', 2], ['add support', 3], ['integrate', 2], ['expand', 2],
  ],
  [Mode.FIX]: [
    ['fix', 4], ['bug', 3], ['issue', 2], ['error', 3], ['broken', 4],
    ['debug', 3], ['resolve', 2], ['not working', 4], ['fails', 3],
  ],
};

function calculateModeScores(request) {
  const requestLower = request.toLowerCase();
  const scores = { [Mode.CREATE]: 0, [Mode.REFACTOR]: 0, [Mode.IMPROVE]: 0, [Mode.FIX]: 0 };

  for (const [mode, keywords] of Object.entries(KEYWORD_WEIGHTS)) {
    for (const [keyword, weight] of keywords) {
      if (requestLower.includes(keyword)) {
        scores[mode] += weight;
      }
    }
  }

  return scores;
}

function detectMode(request, skillPath) {
  const existingSkill = Boolean(
    skillPath && existsSync(skillPath) && existsSync(path.join(skillPath, 'SKILL.md'))
  );
  const scores = calculateModeScores(request);

  if (!existingSkill) {
    scores[Mode.CREATE] += 3;
  } else {
    scores[Mode.IMPROVE] += 1;
  }

  const maxScore = Math.max(...Object.values(scores));
  const reasons = [];
  let mode, confidence;

  if (maxScore === 0) {
    mode = existingSkill ? Mode.IMPROVE : Mode.CREATE;
    confidence = 0.4;
    reasons.push('No specific keywords detected, using context-based default');
  } else {
    mode = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    confidence = Math.max(Math.min(maxScore / 8.0, 1.0), 0.3);

    const matchedKeywords = [];
    for (const [keyword] of (KEYWORD_WEIGHTS[mode] || [])) {
      if (request.toLowerCase().includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
    if (matchedKeywords.length > 0) {
      reasons.push(`Matched keywords: ${matchedKeywords.join(', ')}`);
    }
  }

  if (existingSkill) {
    reasons.push('Existing skill detected at provided path');
  } else {
    reasons.push('No existing skill found' + (mode === Mode.CREATE ? ' — defaulting to CREATE' : ''));
  }

  const alternatives = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([m, s]) => m !== mode && s > 0)
    .map(([m]) => m)
    .slice(0, 2);

  return {
    mode,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    alternatives,
    existing_skill: existingSkill,
  };
}

const { values } = parseArgs({
  options: {
    request: { type: 'string' },
    'skill-path': { type: 'string' },
  },
  strict: true,
});

if (!values.request) {
  console.error('Usage: node mode_detector.mjs --request "user request text" [--skill-path <path>]');
  process.exit(1);
}

const result = detectMode(values.request, values['skill-path'] || null);
console.log(JSON.stringify(result, null, 2));
