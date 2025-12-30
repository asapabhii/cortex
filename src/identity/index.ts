/**
 * Identity Module
 *
 * Exports all identity-related types and services.
 */

export {
  IdentityService,
  IdentityStorage,
  InMemoryIdentityStorage,
} from './identity.service.js';

export {
  validateCreateInput,
  validateIdentity,
  validateUpdateInput,
} from './schema.js';

export {
  CreateIdentityInput,
  Identity,
  IdentityVersion,
  Invariant,
  RiskPosture,
  StyleConstraint,
  UpdateIdentityInput,
  ValidationResult,
  Value,
} from './types.js';

