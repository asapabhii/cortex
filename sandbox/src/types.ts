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
 * Value snapshot for restoration
 */
export interface ValueSnapshot {
  id: string;
  name: string;
  description: string;
  priority: number;
}

/**
 * Invariant snapshot for restoration
 */
export interface InvariantSnapshot {
  id: string;
  description: string;
  rule: string;
  rationale: string;
}

/**
 * Style constraint snapshot for restoration
 */
export interface StyleConstraintSnapshot {
  id: string;
  aspect: string;
  constraint: string;
}

/**
 * Snapshot of identity state
 *
 * Contains full data required for deterministic restoration.
 */
export interface IdentitySnapshot {
  id: string;
  name: string;
  version: number;
  riskPosture: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  values: ValueSnapshot[];
  invariants: InvariantSnapshot[];
  styleConstraints: StyleConstraintSnapshot[];
}

/**
 * Snapshot of a single distilled memory
 *
 * Contains full data required for deterministic restoration.
 */
export interface MemorySnapshot {
  id: string;
  type: string;
  content: string;
  confidence: number;
  reinforcementCount: number;
  decayFactor: number;
  createdAt: string;
  lastReinforcedAt: string;
  lastDecayAt: string;
  tags: string[];
  sourceContext?: string;
}

/**
 * Snapshot of a single failure pattern
 *
 * Contains full data required for deterministic restoration.
 */
export interface FailureSnapshot {
  id: string;
  pattern: string;
  context: string;
  severity: string;
  reason: string;
  occurrenceCount: number;
  active: boolean;
  createdAt: string;
  lastOccurredAt: string;
  tags: string[];
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
 * A single difference found during comparison
 */
export interface Difference {
  path: string;
  expected: unknown;
  actual: unknown;
}

/**
 * Result of comparing two sandbox outputs
 */
export interface ComparisonResult {
  identical: boolean;
  differences: Difference[];
}

/**
 * Result of replaying a recorded run
 */
export interface ReplayResult {
  recordedRun: RecordedRun;
  replayOutput: SandboxOutput;
  comparison: ComparisonResult;
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

