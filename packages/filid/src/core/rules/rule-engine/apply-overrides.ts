import type { Rule, RuleOverride } from '../../../types/rules.js';
import { remapSeverity } from './utils/remap-severity.js';
import { wrapExempt } from './utils/wrap-exempt.js';

/**
 * 프로젝트별 오버라이드를 내장 규칙에 적용한다.
 *
 * Composes check wrappers in this order: `rule.check` → (optional) severity
 * remap → (optional) exempt wrap. The linear chain makes the sequential
 * composition explicit — each wrapper takes the previous check as input and
 * returns the next one. Rule bodies never see either mechanism, preserving
 * `Rule.check` purity.
 */
export function applyOverrides(
  rules: Rule[],
  overrides: Record<string, RuleOverride>,
): Rule[] {
  return rules.map((rule) => {
    const override = overrides[rule.id];
    if (!override) return rule;
    const newEnabled = override.enabled ?? rule.enabled;
    const newSeverity = override.severity ?? rule.severity;
    const hasExempt = !!override.exempt && override.exempt.length > 0;
    if (
      newEnabled === rule.enabled &&
      newSeverity === rule.severity &&
      !hasExempt
    ) {
      return rule;
    }
    let check = rule.check;
    if (newSeverity !== rule.severity) check = remapSeverity(check, newSeverity);
    if (hasExempt) check = wrapExempt(check, override.exempt!);
    return { ...rule, enabled: newEnabled, severity: newSeverity, check };
  });
}
