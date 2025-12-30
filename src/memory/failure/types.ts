/**
 * Failure Memory Types
 *
 * Types for the failure-first learning system.
 * Failures are stored more strongly than successes and can block known bad patterns.
 */

/**
 * Severity level of a failure
 *
 * - hard: Block completely - prevents the pattern from being used
 * - soft: Bias against - reduces likelihood but does not block
 */
export type FailureSeverity = 'hard' | 'soft';

/**
 * A recorded failure pattern
 */
export interface FailurePattern {
  /** Unique identifier */
  id: string;

  /** The pattern that caused the failure (text, regex pattern, or semantic description) */
  pattern: string;

  /** Context in which this failure occurred */
  context: string;

  /** Severity level */
  severity: FailureSeverity;

  /** Number of times this failure has been recorded */
  occurrenceCount: number;

  /** ISO timestamp of first occurrence */
  createdAt: string;

  /** ISO timestamp of most recent occurrence */
  lastOccurredAt: string;

  /** Why this is considered a failure */
  reason: string;

  /** Optional tags for categorization */
  tags: string[];

  /** Whether this pattern is currently active */
  active: boolean;
}

/**
 * Input for recording a failure
 */
export interface RecordFailureInput {
  /** The pattern that caused the failure */
  pattern: string;

  /** Context in which this failure occurred */
  context: string;

  /** Severity level */
  severity: FailureSeverity;

  /** Why this is considered a failure */
  reason: string;

  /** Optional tags */
  tags?: string[];
}

/**
 * Result of checking for blocking patterns
 */
export interface BlockCheckResult {
  /** Whether the input should be blocked */
  blocked: boolean;

  /** Patterns that matched (if any) */
  matchedPatterns: FailurePattern[];

  /** Combined severity of matched patterns */
  severity: FailureSeverity | null;
}

/**
 * Query parameters for retrieving failures
 */
export interface FailureQuery {
  /** Filter by severity */
  severity?: FailureSeverity;

  /** Filter by tags */
  tags?: string[];

  /** Filter by active status */
  active?: boolean;

  /** Minimum occurrence count */
  minOccurrences?: number;

  /** Maximum results */
  limit?: number;

  /** Semantic query for pattern matching */
  semanticQuery?: string;

  /** Similarity threshold for semantic matching */
  similarityThreshold?: number;
}

/**
 * Configuration for failure memory behavior
 */
export interface FailureMemoryConfig {
  /** Similarity threshold for detecting duplicate failures (0-1) */
  duplicateThreshold: number;

  /** Default severity for new failures */
  defaultSeverity: FailureSeverity;

  /** Similarity threshold for blocking checks (0-1) */
  blockingThreshold: number;
}

/**
 * Default configuration
 */
export const DEFAULT_FAILURE_CONFIG: FailureMemoryConfig = {
  blockingThreshold: 0.7,
  defaultSeverity: 'soft',
  duplicateThreshold: 0.8,
};

/**
 * Valid severity levels
 */
export const VALID_SEVERITIES: FailureSeverity[] = ['hard', 'soft'];

/**
 * Validation result
 */
export interface FailureValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a RecordFailureInput
 */
export function validateRecordFailureInput(input: RecordFailureInput): FailureValidationResult {
  const errors: string[] = [];

  if (typeof input.pattern !== 'string' || input.pattern.trim().length === 0) {
    errors.push('pattern must be a non-empty string');
  }

  if (typeof input.context !== 'string' || input.context.trim().length === 0) {
    errors.push('context must be a non-empty string');
  }

  if (!VALID_SEVERITIES.includes(input.severity)) {
    errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  if (typeof input.reason !== 'string' || input.reason.trim().length === 0) {
    errors.push('reason must be a non-empty string');
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

