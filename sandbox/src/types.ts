/**
 * Sandbox Types
 *
 * Structural types for sandbox input, output, and state inspection.
 */

/**
 * Input specification for a sandbox run
 */
export interface SandboxInputSpec {
  /** Identity ID to load */
  identityId: string;

  /** Query text for context preparation */
  query: string;

  /** Optional additional context */
  context?: string;

  /** Optional memory retrieval overrides */
  memoryOptions?: {
    limitPerType?: number;
    minConfidence?: number;
    similarityThreshold?: number;
  };

  /** Optional failure check overrides */
  failureOptions?: {
    skipCheck?: boolean;
    similarityThreshold?: number;
  };
}

/**
 * Snapshot of identity state
 */
export interface IdentitySnapshot {
  id: string;
  name: string;
  version: number;
  riskPosture: string;
  valuesCount: number;
  invariantsCount: number;
  styleConstraintsCount: number;
}

/**
 * Snapshot of a single distilled memory
 */
export interface MemorySnapshot {
  id: string;
  type: string;
  content: string;
  confidence: number;
  reinforcementCount: number;
  decayFactor: number;
}

/**
 * Snapshot of a single failure pattern
 */
export interface FailureSnapshot {
  id: string;
  pattern: string;
  severity: string;
  occurrenceCount: number;
  active: boolean;
}

/**
 * Complete state snapshot
 */
export interface StateSnapshot {
  identity: IdentitySnapshot | null;
  memories: MemorySnapshot[];
  failures: FailureSnapshot[];
  timestamp: string;
}

/**
 * Engine decision details
 */
export interface DecisionDetails {
  blocked: boolean;
  blockReason?: string;
  matchedPatternCount: number;
  retrievedMemoryCount: number;
}

/**
 * Sandbox run output
 */
export interface SandboxOutput {
  success: boolean;
  input: SandboxInputSpec;
  stateBefore: StateSnapshot;
  stateAfter: StateSnapshot;
  decision: DecisionDetails;
  error?: string;
  durationMs: number;
}

/**
 * Recorded run for replay
 */
export interface RecordedRun {
  id: string;
  timestamp: string;
  input: SandboxInputSpec;
  stateBefore: StateSnapshot;
  output: SandboxOutput;
}

/**
 * Validation result for input spec
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a sandbox input specification
 */
export function validateInputSpec(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { errors: ['Input must be an object'], valid: false };
  }

  const spec = input as Record<string, unknown>;

  if (typeof spec.identityId !== 'string' || spec.identityId.trim().length === 0) {
    errors.push('identityId must be a non-empty string');
  }

  if (typeof spec.query !== 'string' || spec.query.trim().length === 0) {
    errors.push('query must be a non-empty string');
  }

  if (spec.context !== undefined && typeof spec.context !== 'string') {
    errors.push('context must be a string if provided');
  }

  if (spec.memoryOptions !== undefined) {
    if (typeof spec.memoryOptions !== 'object' || spec.memoryOptions === null) {
      errors.push('memoryOptions must be an object if provided');
    }
  }

  if (spec.failureOptions !== undefined) {
    if (typeof spec.failureOptions !== 'object' || spec.failureOptions === null) {
      errors.push('failureOptions must be an object if provided');
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

