/**
 * Identity Core Types
 *
 * Identity is a versioned, immutable object that defines the stable
 * characteristics of an AI system. It cannot be modified by runtime prompts.
 */

/**
 * Risk tolerance levels for the identity
 */
export type RiskPosture = 'conservative' | 'moderate' | 'aggressive';

/**
 * A single invariant rule that must never be violated
 */
export interface Invariant {
  /** Unique identifier for this invariant */
  id: string;
  /** Human-readable description of the rule */
  description: string;
  /** The rule itself - used for matching/blocking */
  rule: string;
  /** Why this invariant exists */
  rationale: string;
}

/**
 * Style constraints that define how the system should behave
 */
export interface StyleConstraint {
  /** Unique identifier */
  id: string;
  /** What aspect this constrains (e.g., "tone", "verbosity", "formality") */
  aspect: string;
  /** The constraint value or description */
  constraint: string;
}

/**
 * Core values that guide decision-making
 */
export interface Value {
  /** Unique identifier */
  id: string;
  /** Name of the value (e.g., "accuracy", "safety", "helpfulness") */
  name: string;
  /** Description of what this value means */
  description: string;
  /** Priority weight (higher = more important) */
  priority: number;
}

/**
 * The immutable identity core
 */
export interface Identity {
  /** Unique identifier for this identity */
  id: string;
  /** Human-readable name for this identity */
  name: string;
  /** Version number (increments on each update) */
  version: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Core values that guide behavior */
  values: Value[];
  /** Hard rules that must never be violated */
  invariants: Invariant[];
  /** Style and behavioral constraints */
  styleConstraints: StyleConstraint[];
  /** Risk tolerance level */
  riskPosture: RiskPosture;
  /** Optional description of this identity's purpose */
  description?: string;
}

/**
 * Snapshot of an identity at a specific version (for audit trail)
 */
export interface IdentityVersion {
  /** The identity ID this version belongs to */
  identityId: string;
  /** The version number */
  version: number;
  /** Full identity snapshot at this version */
  snapshot: Identity;
  /** ISO timestamp when this version was created */
  createdAt: string;
  /** Reason for this version (e.g., "initial", "updated values") */
  changeReason: string;
}

/**
 * Input for creating a new identity
 */
export interface CreateIdentityInput {
  name: string;
  values: Omit<Value, 'id'>[];
  invariants: Omit<Invariant, 'id'>[];
  styleConstraints: Omit<StyleConstraint, 'id'>[];
  riskPosture: RiskPosture;
  description?: string;
}

/**
 * Input for updating an identity (requires explicit change reason)
 */
export interface UpdateIdentityInput {
  /** Reason for this update (required for audit trail) */
  changeReason: string;
  /** Updated values (optional, keeps existing if not provided) */
  values?: Omit<Value, 'id'>[];
  /** Updated invariants (optional) */
  invariants?: Omit<Invariant, 'id'>[];
  /** Updated style constraints (optional) */
  styleConstraints?: Omit<StyleConstraint, 'id'>[];
  /** Updated risk posture (optional) */
  riskPosture?: RiskPosture;
  /** Updated description (optional) */
  description?: string;
}

/**
 * Result of identity validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

