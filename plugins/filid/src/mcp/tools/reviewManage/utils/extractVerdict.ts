/**
 * Canonical implementation lives in core/prSummary — this file existed as a
 * byte-identical duplicate, which is exactly the two-sources-of-truth failure
 * this plugin polices. Re-export instead of re-implementing.
 */
export { extractVerdict } from '../../../../core/prSummary/prSummary.js';
