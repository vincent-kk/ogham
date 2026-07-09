/**
 * @file contextAssembler.ts
 * @description ContextAssembler 클래스 — 기본 옵션을 보관하는 assembleContext 래퍼.
 */
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';
import type { AssembleOptions, AssembledContext } from '../types/types.js';

import { assembleContext } from './assembleContext.js';

export class ContextAssembler {
  private readonly defaultOptions: AssembleOptions;

  constructor(defaultOptions: AssembleOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  assemble(
    results: ActivationResult[],
    graph: KnowledgeGraph,
    options?: AssembleOptions,
  ): AssembledContext {
    return assembleContext(results, graph, {
      ...this.defaultOptions,
      ...options,
    });
  }
}
