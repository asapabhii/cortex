/**
 * State Snapshot Utilities
 *
 * Read-only capture of Cortex state for inspection and replay.
 */

import { Cortex } from 'cortex';

import {
  FailureSnapshot,
  IdentitySnapshot,
  MemorySnapshot,
  StateSnapshot,
} from './types.js';

/**
 * Capture identity state as a snapshot
 *
 * Returns null if identity does not exist.
 */
export async function captureIdentitySnapshot(
  cortex: Cortex,
  identityId: string
): Promise<IdentitySnapshot | null> {
  const identity = await cortex.identity.load(identityId);

  if (identity === null) {
    return null;
  }

  return {
    id: identity.id,
    invariantsCount: identity.invariants.length,
    name: identity.name,
    riskPosture: identity.riskPosture,
    styleConstraintsCount: identity.styleConstraints.length,
    valuesCount: identity.values.length,
    version: identity.version,
  };
}

/**
 * Capture all distilled memories as snapshots
 */
export async function captureMemorySnapshots(
  cortex: Cortex
): Promise<MemorySnapshot[]> {
  const result = await cortex.memory.retrieve({});
  
  return result.memories.map((memory) => ({
    confidence: memory.confidence,
    content: memory.content,
    decayFactor: memory.decayFactor,
    id: memory.id,
    reinforcementCount: memory.reinforcementCount,
    type: memory.type,
  }));
}

/**
 * Capture all failure patterns as snapshots
 */
export async function captureFailureSnapshots(
  cortex: Cortex
): Promise<FailureSnapshot[]> {
  const patterns = await cortex.failure.retrieve({});

  return patterns.map((pattern) => ({
    active: pattern.active,
    id: pattern.id,
    occurrenceCount: pattern.occurrenceCount,
    pattern: pattern.pattern,
    severity: pattern.severity,
  }));
}

/**
 * Capture complete Cortex state as a snapshot
 */
export async function captureStateSnapshot(
  cortex: Cortex,
  identityId: string
): Promise<StateSnapshot> {
  const [identity, memories, failures] = await Promise.all([
    captureIdentitySnapshot(cortex, identityId),
    captureMemorySnapshots(cortex),
    captureFailureSnapshots(cortex),
  ]);

  return {
    failures,
    identity,
    memories,
    timestamp: new Date().toISOString(),
  };
}

