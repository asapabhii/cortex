/**
 * Identity Schema Validation
 *
 * Provides validation functions for identity objects.
 * Ensures identity integrity before storage or use.
 */

import {
  CreateIdentityInput,
  Identity,
  Invariant,
  RiskPosture,
  StyleConstraint,
  UpdateIdentityInput,
  ValidationResult,
  Value,
} from './types.js';

const VALID_RISK_POSTURES: RiskPosture[] = ['conservative', 'moderate', 'aggressive'];

/**
 * Validates a Value object
 */
function validateValue(value: Omit<Value, 'id'>, index: number): string[] {
  const errors: string[] = [];
  const prefix = `values[${index}]`;

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    errors.push(`${prefix}.name must be a non-empty string`);
  }

  if (typeof value.description !== 'string' || value.description.trim().length === 0) {
    errors.push(`${prefix}.description must be a non-empty string`);
  }

  if (typeof value.priority !== 'number' || value.priority < 0) {
    errors.push(`${prefix}.priority must be a non-negative number`);
  }

  return errors;
}

/**
 * Validates an Invariant object
 */
function validateInvariant(invariant: Omit<Invariant, 'id'>, index: number): string[] {
  const errors: string[] = [];
  const prefix = `invariants[${index}]`;

  if (typeof invariant.description !== 'string' || invariant.description.trim().length === 0) {
    errors.push(`${prefix}.description must be a non-empty string`);
  }

  if (typeof invariant.rule !== 'string' || invariant.rule.trim().length === 0) {
    errors.push(`${prefix}.rule must be a non-empty string`);
  }

  if (typeof invariant.rationale !== 'string' || invariant.rationale.trim().length === 0) {
    errors.push(`${prefix}.rationale must be a non-empty string`);
  }

  return errors;
}

/**
 * Validates a StyleConstraint object
 */
function validateStyleConstraint(constraint: Omit<StyleConstraint, 'id'>, index: number): string[] {
  const errors: string[] = [];
  const prefix = `styleConstraints[${index}]`;

  if (typeof constraint.aspect !== 'string' || constraint.aspect.trim().length === 0) {
    errors.push(`${prefix}.aspect must be a non-empty string`);
  }

  if (typeof constraint.constraint !== 'string' || constraint.constraint.trim().length === 0) {
    errors.push(`${prefix}.constraint must be a non-empty string`);
  }

  return errors;
}

/**
 * Validates a CreateIdentityInput object
 */
export function validateCreateInput(input: CreateIdentityInput): ValidationResult {
  const errors: string[] = [];

  // Validate name
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    errors.push('name must be a non-empty string');
  }

  // Validate risk posture
  if (!VALID_RISK_POSTURES.includes(input.riskPosture)) {
    errors.push(`riskPosture must be one of: ${VALID_RISK_POSTURES.join(', ')}`);
  }

  // Validate values
  if (!Array.isArray(input.values)) {
    errors.push('values must be an array');
  } else {
    input.values.forEach((value, index) => {
      errors.push(...validateValue(value, index));
    });
  }

  // Validate invariants
  if (!Array.isArray(input.invariants)) {
    errors.push('invariants must be an array');
  } else {
    input.invariants.forEach((invariant, index) => {
      errors.push(...validateInvariant(invariant, index));
    });
  }

  // Validate style constraints
  if (!Array.isArray(input.styleConstraints)) {
    errors.push('styleConstraints must be an array');
  } else {
    input.styleConstraints.forEach((constraint, index) => {
      errors.push(...validateStyleConstraint(constraint, index));
    });
  }

  // Validate optional description
  if (input.description !== undefined && typeof input.description !== 'string') {
    errors.push('description must be a string if provided');
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

/**
 * Validates an UpdateIdentityInput object
 */
export function validateUpdateInput(input: UpdateIdentityInput): ValidationResult {
  const errors: string[] = [];

  // Change reason is required
  if (typeof input.changeReason !== 'string' || input.changeReason.trim().length === 0) {
    errors.push('changeReason must be a non-empty string');
  }

  // Validate optional risk posture
  if (input.riskPosture !== undefined && !VALID_RISK_POSTURES.includes(input.riskPosture)) {
    errors.push(`riskPosture must be one of: ${VALID_RISK_POSTURES.join(', ')}`);
  }

  // Validate optional values
  if (input.values !== undefined) {
    if (!Array.isArray(input.values)) {
      errors.push('values must be an array if provided');
    } else {
      input.values.forEach((value, index) => {
        errors.push(...validateValue(value, index));
      });
    }
  }

  // Validate optional invariants
  if (input.invariants !== undefined) {
    if (!Array.isArray(input.invariants)) {
      errors.push('invariants must be an array if provided');
    } else {
      input.invariants.forEach((invariant, index) => {
        errors.push(...validateInvariant(invariant, index));
      });
    }
  }

  // Validate optional style constraints
  if (input.styleConstraints !== undefined) {
    if (!Array.isArray(input.styleConstraints)) {
      errors.push('styleConstraints must be an array if provided');
    } else {
      input.styleConstraints.forEach((constraint, index) => {
        errors.push(...validateStyleConstraint(constraint, index));
      });
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

/**
 * Validates a complete Identity object
 */
export function validateIdentity(identity: Identity): ValidationResult {
  const errors: string[] = [];

  // Validate ID
  if (typeof identity.id !== 'string' || identity.id.trim().length === 0) {
    errors.push('id must be a non-empty string');
  }

  // Validate name
  if (typeof identity.name !== 'string' || identity.name.trim().length === 0) {
    errors.push('name must be a non-empty string');
  }

  // Validate version
  if (typeof identity.version !== 'number' || identity.version < 1) {
    errors.push('version must be a positive integer');
  }

  // Validate timestamps
  if (typeof identity.createdAt !== 'string') {
    errors.push('createdAt must be an ISO timestamp string');
  }

  if (typeof identity.updatedAt !== 'string') {
    errors.push('updatedAt must be an ISO timestamp string');
  }

  // Validate risk posture
  if (!VALID_RISK_POSTURES.includes(identity.riskPosture)) {
    errors.push(`riskPosture must be one of: ${VALID_RISK_POSTURES.join(', ')}`);
  }

  // Validate values have IDs
  if (!Array.isArray(identity.values)) {
    errors.push('values must be an array');
  } else {
    identity.values.forEach((value, index) => {
      if (typeof value.id !== 'string' || value.id.trim().length === 0) {
        errors.push(`values[${index}].id must be a non-empty string`);
      }
      errors.push(...validateValue(value, index));
    });
  }

  // Validate invariants have IDs
  if (!Array.isArray(identity.invariants)) {
    errors.push('invariants must be an array');
  } else {
    identity.invariants.forEach((invariant, index) => {
      if (typeof invariant.id !== 'string' || invariant.id.trim().length === 0) {
        errors.push(`invariants[${index}].id must be a non-empty string`);
      }
      errors.push(...validateInvariant(invariant, index));
    });
  }

  // Validate style constraints have IDs
  if (!Array.isArray(identity.styleConstraints)) {
    errors.push('styleConstraints must be an array');
  } else {
    identity.styleConstraints.forEach((constraint, index) => {
      if (typeof constraint.id !== 'string' || constraint.id.trim().length === 0) {
        errors.push(`styleConstraints[${index}].id must be a non-empty string`);
      }
      errors.push(...validateStyleConstraint(constraint, index));
    });
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

