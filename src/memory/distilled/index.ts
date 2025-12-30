/**
 * Distilled Memory Module
 *
 * Meaning-based long-term memory for AI systems.
 */

export {
  DistilledMemoryService,
  DistilledMemoryStorage,
  InMemoryDistilledStorage,
  MemoryServiceConfig,
} from './memory.service.js';

export {
  CreateMemoryInput,
  DecayConfig,
  DEFAULT_DECAY_CONFIG,
  DistilledMemory,
  MemoryQuery,
  MemoryQueryResult,
  MemoryType,
  MemoryValidationResult,
  MergeResult,
  ReinforcementResult,
  VALID_MEMORY_TYPES,
  validateCreateMemoryInput,
} from './types.js';

