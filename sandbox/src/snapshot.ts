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
 * Captures full data required for deterministic restoration.
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
    createdAt: identity.createdAt,
    description: identity.description,
    id: identity.id,
    invariants: identity.invariants.map((inv) => ({
      description: inv.description,
      id: inv.id,
      rationale: inv.rationale,
      rule: inv.rule,
    })),
    name: identity.name,
    riskPosture: identity.riskPosture,
    styleConstraints: identity.styleConstraints.map((sc) => ({
      aspect: sc.aspect,
      constraint: sc.constraint,
      id: sc.id,
    })),
    updatedAt: identity.updatedAt,
    values: identity.values.map((v) => ({
      description: v.description,
      id: v.id,
      name: v.name,
      priority: v.priority,
    })),
    version: identity.version,
  };
}

/**
 * Capture all distilled memories as snapshots
 *
 * Captures full data required for deterministic restoration.
 */
export async function captureMemorySnapshots(
  cortex: Cortex
): Promise<MemorySnapshot[]> {
  const result = await cortex.memory.retrieve({});
  
  return result.memories.map((memory) => ({
    confidence: memory.confidence,
    content: memory.content,
    createdAt: memory.createdAt,
    decayFactor: memory.decayFactor,
    id: memory.id,
    lastDecayAt: memory.lastDecayAt,
    lastReinforcedAt: memory.lastReinforcedAt,
    reinforcementCount: memory.reinforcementCount,
    sourceContext: memory.sourceContext,
    tags: [...memory.tags],
    type: memory.type,
  }));
}

/**
 * Capture all failure patterns as snapshots
 *
 * Captures full data required for deterministic restoration.
 */
export async function captureFailureSnapshots(
  cortex: Cortex
): Promise<FailureSnapshot[]> {
  const patterns = await cortex.failure.retrieve({});

  return patterns.map((pattern) => ({
    active: pattern.active,
    context: pattern.context,
    createdAt: pattern.createdAt,
    id: pattern.id,
    lastOccurredAt: pattern.lastOccurredAt,
    occurrenceCount: pattern.occurrenceCount,
    pattern: pattern.pattern,
    reason: pattern.reason,
    severity: pattern.severity,
    tags: [...pattern.tags],
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

