/**
 * Distilled Memory Types
 *
 * Types for the meaning-based memory system.
 * Memories store distilled lessons, not raw conversations.
 */

/**
 * Categories of distilled memory
 */
export type MemoryType = 'lesson' | 'preference' | 'warning';

/**
 * A distilled memory entry
 *
 * Represents a single piece of learned knowledge,
 * extracted and condensed from experience.
 */
export interface DistilledMemory {
  /** Unique identifier */
  id: string;

  /** Category of this memory */
  type: MemoryType;

  /** Short, distilled statement of the memory content */
  content: string;

  /** Confidence score (0-1, higher = more confident) */
  confidence: number;

  /** Number of times this memory has been reinforced */
  reinforcementCount: number;

  /** ISO timestamp of when this memory was created */
  createdAt: string;

  /** ISO timestamp of when this memory was last reinforced */
  lastReinforcedAt: string;

  /** ISO timestamp of when decay was last applied */
  lastDecayAt: string;

  /** Current decay factor (0-1, lower = more decayed) */
  decayFactor: number;

  /** Optional tags for categorization */
  tags: string[];

  /** Optional source context (e.g., which interaction this came from) */
  sourceContext?: string;
}

/**
 * Input for creating a new memory
 */
export interface CreateMemoryInput {
  /** Category of this memory */
  type: MemoryType;

  /** Short, distilled statement of the memory content */
  content: string;

  /** Initial confidence score (0-1), defaults to 0.5 if not provided */
  confidence?: number;

  /** Optional tags for categorization */
  tags?: string[];

  /** Optional source context */
  sourceContext?: string;
}

/**
 * Result of reinforcing a memory
 */
export interface ReinforcementResult {
  /** The updated memory */
  memory: DistilledMemory;

  /** Previous confidence before reinforcement */
  previousConfidence: number;

  /** New confidence after reinforcement */
  newConfidence: number;

  /** Previous reinforcement count */
  previousReinforcementCount: number;
}

/**
 * Result of merging two memories
 */
export interface MergeResult {
  /** The merged memory (kept) */
  merged: DistilledMemory;

  /** The memory that was removed */
  removed: DistilledMemory;

  /** Similarity score between the two memories */
  similarityScore: number;
}

/**
 * Configuration for memory decay behavior
 */
export interface DecayConfig {
  /** How much to reduce decayFactor per decay cycle (e.g., 0.1 = 10% reduction) */
  decayRate: number;

  /** Minimum time between decay applications (in milliseconds) */
  decayIntervalMs: number;

  /** Confidence threshold below which memories are deleted */
  deletionThreshold: number;

  /** Decay factor threshold below which memories are deleted */
  decayFactorThreshold: number;
}

/**
 * Default decay configuration
 */
export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  decayFactorThreshold: 0.1,
  decayIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  decayRate: 0.05,
  deletionThreshold: 0.2,
};

/**
 * Query parameters for retrieving memories
 */
export interface MemoryQuery {
  /** Filter by memory type */
  type?: MemoryType;

  /** Filter by tags (memories must have ALL specified tags) */
  tags?: string[];

  /** Minimum confidence threshold */
  minConfidence?: number;

  /** Maximum number of results */
  limit?: number;

  /** Semantic query string (requires similarity provider) */
  semanticQuery?: string;

  /** Minimum similarity score for semantic matching */
  similarityThreshold?: number;
}

/**
 * Result of a memory query
 */
export interface MemoryQueryResult {
  /** Matching memories */
  memories: DistilledMemory[];

  /** Total count of matching memories (before limit) */
  totalCount: number;
}

/**
 * Validation result for memory operations
 */
export interface MemoryValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid memory types for validation
 */
export const VALID_MEMORY_TYPES: MemoryType[] = ['lesson', 'preference', 'warning'];

/**
 * Validates a CreateMemoryInput
 */
export function validateCreateMemoryInput(input: CreateMemoryInput): MemoryValidationResult {
  const errors: string[] = [];

  if (!VALID_MEMORY_TYPES.includes(input.type)) {
    errors.push(`type must be one of: ${VALID_MEMORY_TYPES.join(', ')}`);
  }

  if (typeof input.content !== 'string' || input.content.trim().length === 0) {
    errors.push('content must be a non-empty string');
  }

  if (input.confidence !== undefined) {
    if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
      errors.push('confidence must be a number between 0 and 1');
    }
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) {
      errors.push('tags must be an array of strings');
    } else {
      for (let i = 0; i < input.tags.length; i++) {
        if (typeof input.tags[i] !== 'string') {
          errors.push(`tags[${i}] must be a string`);
        }
      }
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

