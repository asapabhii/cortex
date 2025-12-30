/**
 * Engine Types
 *
 * Types for the central orchestration engine.
 * The engine coordinates identity, memory, and failure modules
 * to prepare structured context for downstream consumers.
 */

import { DistilledMemory } from '../memory/distilled/types.js';
import { BlockCheckResult, FailurePattern } from '../memory/failure/types.js';
import { Identity } from '../identity/types.js';

/**
 * Structured identity context for injection
 *
 * Provides identity data in a structured format.
 * Consumers decide how to format this for their LLM.
 */
export interface IdentityContext {
  /** Identity name */
  name: string;

  /** Core values with priorities */
  values: Array<{
    name: string;
    description: string;
    priority: number;
  }>;

  /** Hard rules that must not be violated */
  invariants: Array<{
    rule: string;
    rationale: string;
  }>;

  /** Style constraints */
  styleConstraints: Array<{
    aspect: string;
    constraint: string;
  }>;

  /** Risk tolerance level */
  riskPosture: string;

  /** Optional description */
  description?: string;
}

/**
 * Structured memory context for injection
 */
export interface MemoryContext {
  /** Lessons learned from past experience */
  lessons: Array<{
    content: string;
    confidence: number;
  }>;

  /** User or system preferences */
  preferences: Array<{
    content: string;
    confidence: number;
  }>;

  /** Warnings to consider */
  warnings: Array<{
    content: string;
    confidence: number;
  }>;
}

/**
 * Structured failure context
 */
export interface FailureContext {
  /** Whether the request is blocked */
  blocked: boolean;

  /** Reason for blocking (if blocked) */
  blockReason?: string;

  /** Hard-block patterns that matched */
  hardBlocks: Array<{
    pattern: string;
    reason: string;
    occurrenceCount: number;
  }>;

  /** Soft-block patterns to bias against */
  softBlocks: Array<{
    pattern: string;
    reason: string;
    occurrenceCount: number;
  }>;
}

/**
 * Complete prepared context
 *
 * The structured output of the context preparation pipeline.
 * Contains all information needed for LLM context injection.
 */
export interface CortexContext {
  /** The loaded identity */
  identity: Identity;

  /** Structured identity context */
  identityContext: IdentityContext;

  /** Relevant memories organized by type */
  memoryContext: MemoryContext;

  /** Failure patterns and blocking status */
  failureContext: FailureContext;

  /** Raw memories for advanced use cases */
  rawMemories: DistilledMemory[];

  /** Raw blocking result for advanced use cases */
  rawBlockingResult: BlockCheckResult;

  /** Timestamp of context preparation */
  preparedAt: string;
}

/**
 * Input for context preparation
 */
export interface PrepareContextInput {
  /** Identity ID to load */
  identityId: string;

  /** The user query or input text */
  query: string;

  /** Optional additional context */
  context?: string;

  /** Optional memory query overrides */
  memoryOptions?: {
    /** Maximum memories per type */
    limitPerType?: number;
    /** Minimum confidence for inclusion */
    minConfidence?: number;
    /** Similarity threshold for semantic matching */
    similarityThreshold?: number;
  };

  /** Optional failure check overrides */
  failureOptions?: {
    /** Skip failure checking entirely */
    skipCheck?: boolean;
    /** Custom similarity threshold */
    similarityThreshold?: number;
  };
}

/**
 * Result when context preparation succeeds
 */
export interface PrepareContextSuccess {
  success: true;
  context: CortexContext;
}

/**
 * Result when context preparation is blocked
 */
export interface PrepareContextBlocked {
  success: false;
  blocked: true;
  reason: string;
  matchedPatterns: FailurePattern[];
}

/**
 * Result when context preparation fails
 */
export interface PrepareContextError {
  success: false;
  blocked: false;
  error: string;
}

/**
 * Union type for all context preparation results
 */
export type PrepareContextResult =
  | PrepareContextSuccess
  | PrepareContextBlocked
  | PrepareContextError;

/**
 * Engine configuration
 */
export interface CortexEngineConfig {
  /** Default memory retrieval limit per type */
  defaultMemoryLimit: number;

  /** Default minimum confidence for memory inclusion */
  defaultMinConfidence: number;

  /** Default similarity threshold for memory matching */
  defaultSimilarityThreshold: number;

  /** Default similarity threshold for failure blocking */
  defaultBlockingThreshold: number;

  /** Whether to throw on blocked requests (vs returning blocked result) */
  throwOnBlocked: boolean;
}

/**
 * Default engine configuration
 */
export const DEFAULT_ENGINE_CONFIG: CortexEngineConfig = {
  defaultBlockingThreshold: 0.7,
  defaultMemoryLimit: 10,
  defaultMinConfidence: 0.3,
  defaultSimilarityThreshold: 0.5,
  throwOnBlocked: false,
};

