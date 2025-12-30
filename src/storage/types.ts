/**
 * Storage Types
 *
 * Consolidated storage interfaces for Cortex.
 * These interfaces define the contract that any storage backend must implement.
 */

// Re-export storage interfaces from their source modules
export { IdentityStorage } from '../identity/identity.service.js';
export { DistilledMemoryStorage } from '../memory/distilled/memory.service.js';
export { FailureMemoryStorage } from '../memory/failure/failure.service.js';

// Re-export in-memory implementations for convenience
export { InMemoryIdentityStorage } from '../identity/identity.service.js';
export { InMemoryDistilledStorage } from '../memory/distilled/memory.service.js';
export { InMemoryFailureStorage } from '../memory/failure/failure.service.js';

/**
 * Storage backend configuration
 */
export interface StorageConfig {
  /** Path to the database file (for file-based storage) */
  path?: string;

  /** Whether to create tables if they don't exist */
  createIfNotExists?: boolean;
}

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  createIfNotExists: true,
  path: ':memory:',
};

/**
 * Storage initialization result
 */
export interface StorageInitResult {
  success: boolean;
  error?: string;
}

