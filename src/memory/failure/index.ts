/**
 * Failure Memory Module
 *
 * Failure-first learning for AI systems.
 */

export {
  FailureMemoryService,
  FailureMemoryStorage,
  InMemoryFailureStorage,
} from './failure.service.js';

export {
  BlockCheckResult,
  DEFAULT_FAILURE_CONFIG,
  FailureMemoryConfig,
  FailurePattern,
  FailureQuery,
  FailureSeverity,
  FailureValidationResult,
  RecordFailureInput,
  VALID_SEVERITIES,
  validateRecordFailureInput,
} from './types.js';

