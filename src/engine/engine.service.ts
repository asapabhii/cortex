/**
 * Cortex Engine Service
 *
 * Central orchestration layer that coordinates identity, memory,
 * and failure modules to prepare structured context for LLM calls.
 */

import { DistilledMemoryService } from '../memory/distilled/memory.service.js';
import { FailureMemoryService } from '../memory/failure/failure.service.js';
import { Identity } from '../identity/types.js';
import { IdentityService } from '../identity/identity.service.js';
import {
  CortexContext,
  CortexEngineConfig,
  DEFAULT_ENGINE_CONFIG,
  FailureContext,
  IdentityContext,
  MemoryContext,
  PrepareContextInput,
  PrepareContextResult,
} from './types.js';

/**
 * Cortex Engine
 *
 * Orchestrates the preparation of structured context from identity,
 * memory, and failure modules. Returns data structures, not prompts.
 */
export class CortexEngine {
  private readonly config: CortexEngineConfig;

  constructor(
    private readonly identityService: IdentityService,
    private readonly memoryService: DistilledMemoryService,
    private readonly failureService: FailureMemoryService,
    config?: Partial<CortexEngineConfig>
  ) {
    this.config = {
      ...DEFAULT_ENGINE_CONFIG,
      ...config,
    };
  }

  /**
   * Prepare structured context for an LLM call
   *
   * Pipeline:
   * 1. Load identity
   * 2. Check failure patterns (early return if hard-blocked)
   * 3. Retrieve relevant memories
   * 4. Build structured context
   * 5. Return result
   */
  async prepareContext(input: PrepareContextInput): Promise<PrepareContextResult> {
    const preparedAt = new Date().toISOString();

    // Step 1: Load identity
    const identity = await this.identityService.load(input.identityId);
    if (identity === null) {
      return {
        blocked: false,
        error: `Identity not found: ${input.identityId}`,
        success: false,
      };
    }

    // Step 2: Check failure patterns (unless skipped)
    const skipFailureCheck = input.failureOptions?.skipCheck === true;

    const blockingResult = await this.failureService.checkBlocking(
      input.query,
      input.context
    );

    if (!skipFailureCheck && blockingResult.blocked) {
      // Early return on hard block
      const primaryPattern = blockingResult.matchedPatterns[0];
      return {
        blocked: true,
        matchedPatterns: blockingResult.matchedPatterns,
        reason: primaryPattern?.reason ?? 'Matched hard-block failure pattern',
        success: false,
      };
    }

    // Step 3: Retrieve relevant memories
    const memoryLimit = input.memoryOptions?.limitPerType
      ?? this.config.defaultMemoryLimit;
    const minConfidence = input.memoryOptions?.minConfidence
      ?? this.config.defaultMinConfidence;
    const similarityThreshold = input.memoryOptions?.similarityThreshold
      ?? this.config.defaultSimilarityThreshold;

    const [lessonsResult, preferencesResult, warningsResult] = await Promise.all([
      this.memoryService.retrieve({
        limit: memoryLimit,
        minConfidence,
        semanticQuery: input.query,
        similarityThreshold,
        type: 'lesson',
      }),
      this.memoryService.retrieve({
        limit: memoryLimit,
        minConfidence,
        semanticQuery: input.query,
        similarityThreshold,
        type: 'preference',
      }),
      this.memoryService.retrieve({
        limit: memoryLimit,
        minConfidence,
        semanticQuery: input.query,
        similarityThreshold,
        type: 'warning',
      }),
    ]);

    // Step 4: Build structured context
    const identityContext = this.buildIdentityContext(identity);
    const memoryContext = this.buildMemoryContext(
      lessonsResult.memories,
      preferencesResult.memories,
      warningsResult.memories
    );
    const failureContext = this.buildFailureContext(blockingResult);

    const allMemories = [
      ...lessonsResult.memories,
      ...preferencesResult.memories,
      ...warningsResult.memories,
    ];

    const context: CortexContext = {
      failureContext,
      identity,
      identityContext,
      memoryContext,
      preparedAt,
      rawBlockingResult: blockingResult,
      rawMemories: allMemories,
    };

    return {
      context,
      success: true,
    };
  }

  /**
   * Build structured failure context from blocking result
   */
  private buildFailureContext(
    blockingResult: { blocked: boolean; matchedPatterns: Array<{ pattern: string; reason: string; occurrenceCount: number; severity: string }> }
  ): FailureContext {
    const hardBlocks = blockingResult.matchedPatterns
      .filter((p) => p.severity === 'hard')
      .map((p) => ({
        occurrenceCount: p.occurrenceCount,
        pattern: p.pattern,
        reason: p.reason,
      }));

    const softBlocks = blockingResult.matchedPatterns
      .filter((p) => p.severity === 'soft')
      .map((p) => ({
        occurrenceCount: p.occurrenceCount,
        pattern: p.pattern,
        reason: p.reason,
      }));

    const blockReason = blockingResult.blocked && hardBlocks.length > 0
      ? hardBlocks[0].reason
      : undefined;

    return {
      blocked: blockingResult.blocked,
      blockReason,
      hardBlocks,
      softBlocks,
    };
  }

  /**
   * Build structured identity context from identity
   */
  private buildIdentityContext(identity: Identity): IdentityContext {
    return {
      description: identity.description,
      invariants: identity.invariants.map((inv) => ({
        rationale: inv.rationale,
        rule: inv.rule,
      })),
      name: identity.name,
      riskPosture: identity.riskPosture,
      styleConstraints: identity.styleConstraints.map((sc) => ({
        aspect: sc.aspect,
        constraint: sc.constraint,
      })),
      values: identity.values
        .sort((a, b) => b.priority - a.priority)
        .map((v) => ({
          description: v.description,
          name: v.name,
          priority: v.priority,
        })),
    };
  }

  /**
   * Build structured memory context from retrieved memories
   */
  private buildMemoryContext(
    lessons: Array<{ content: string; confidence: number }>,
    preferences: Array<{ content: string; confidence: number }>,
    warnings: Array<{ content: string; confidence: number }>
  ): MemoryContext {
    return {
      lessons: lessons.map((m) => ({
        confidence: m.confidence,
        content: m.content,
      })),
      preferences: preferences.map((m) => ({
        confidence: m.confidence,
        content: m.content,
      })),
      warnings: warnings.map((m) => ({
        confidence: m.confidence,
        content: m.content,
      })),
    };
  }
}

