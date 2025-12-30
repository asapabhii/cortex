/**
 * Cortex - Cognitive Infrastructure Layer for AI Systems
 *
 * This is the main entry point for the Cortex library.
 * V1 provides: Identity Core, Meaning-Based Memory, and Failure Memory.
 */

export const VERSION = '0.1.0';

// Identity Core
export * from './identity/index.js';

// Interfaces
export * from './interfaces/index.js';

// Distilled Memory
export * from './memory/distilled/index.js';

// Failure Memory
export * from './memory/failure/index.js';

// Engine
export * from './engine/index.js';
