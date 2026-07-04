import type MarkdownIt from "markdown-it";
import type { RenderRule } from "markdown-it/lib/renderer.mjs";

import { isLocalImageSrc } from "../utils/isLocalImageSrc.js";

export interface ImageRewrite {
  sessionId: string;
  token: string;
}

interface ImageRewriteEnv {
  imageRewrite?: ImageRewrite;
  localImageIndex?: number;
}

/**
 * Override the `image` renderer rule: when `env.imageRewrite` is set, rewrite a
 * `file://` src to the session-scoped `/api/image/<sid>/<i>` route (others —
 * http/https/data/relative — pass through). The per-render index increments in
 * document order, matching `walkLocalImages`. Falls back to markdown-it's
 * default image rendering so `alt` handling is preserved.
 */
export function imageRule(markdownIt: MarkdownIt): void {
  const fallback: RenderRule =
    markdownIt.renderer.rules.image ??
    ((tokens, tokenIndex, options, _env, self) =>
      self.renderToken(tokens, tokenIndex, options));

  markdownIt.renderer.rules.image = (
    tokens,
    tokenIndex,
    options,
    env,
    self,
  ) => {
    const rewriteEnv = env as ImageRewriteEnv;
    if (rewriteEnv.imageRewrite) {
      const token = tokens[tokenIndex];
      const source = token.attrGet("src");
      if (source !== null && isLocalImageSrc(source)) {
        const index = rewriteEnv.localImageIndex ?? 0;
        rewriteEnv.localImageIndex = index + 1;
        token.attrSet(
          "src",
          `/api/image/${rewriteEnv.imageRewrite.sessionId}/${index}?token=${encodeURIComponent(rewriteEnv.imageRewrite.token)}`,
        );
      }
    }
    return fallback(tokens, tokenIndex, options, env, self);
  };
}
