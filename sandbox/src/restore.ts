/**
 * State Restoration
 *
 * Restores Cortex state from a snapshot for deterministic replay.
 * Bypasses service APIs to preserve exact IDs, timestamps, and state.
 */

import {
  Cortex,
  DistilledMemory,
  DistilledMemoryService,
  ExactMatchSimilarityProvider,
  FailureMemoryService,
  FailurePattern,
  FailureSeverity,
  Identity,
  IdentityService,
  IdentityVersion,
  InMemoryDistilledStorage,
  InMemoryFailureStorage,
  InMemoryIdentityStorage,
  MemoryType,
  RiskPosture,
} from 'cortex';

import {
  FailureSnapshot,
  IdentitySnapshot,
  MemorySnapshot,
  StateSnapshot,
} from './types.js';

/**
 * Restoration error for strict validation failures
 */
export class RestorationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestorationError';
  }
}

/**
 * Validate identity snapshot has all required fields for restoration
 */
function validateIdentitySnapshot(snapshot: IdentitySnapshot): void {
  if (!snapshot.id) {
    throw new RestorationError('Identity snapshot missing id');
  }
  if (!snapshot.name) {
    throw new RestorationError('Identity snapshot missing name');
  }
  if (typeof snapshot.version !== 'number') {
    throw new RestorationError('Identity snapshot missing version');
  }
  if (!snapshot.riskPosture) {
    throw new RestorationError('Identity snapshot missing riskPosture');
  }
  if (!snapshot.createdAt) {
    throw new RestorationError('Identity snapshot missing createdAt');
  }
  if (!snapshot.updatedAt) {
    throw new RestorationError('Identity snapshot missing updatedAt');
  }
  if (!Array.isArray(snapshot.values)) {
    throw new RestorationError('Identity snapshot missing values array');
  }
  if (!Array.isArray(snapshot.invariants)) {
    throw new RestorationError('Identity snapshot missing invariants array');
  }
  if (!Array.isArray(snapshot.styleConstraints)) {
    throw new RestorationError('Identity snapshot missing styleConstraints array');
  }

  // Validate nested objects have IDs
  for (const value of snapshot.values) {
    if (!value.id) {
      throw new RestorationError('Identity value missing id');
    }
  }
  for (const inv of snapshot.invariants) {
    if (!inv.id) {
      throw new RestorationError('Identity invariant missing id');
    }
  }
  for (const sc of snapshot.styleConstraints) {
    if (!sc.id) {
      throw new RestorationError('Identity styleConstraint missing id');
    }
  }
}

/**
 * Validate memory snapshot has all required fields for restoration
 */
function validateMemorySnapshot(snapshot: MemorySnapshot, index: number): void {
  if (!snapshot.id) {
    throw new RestorationError(`Memory[${index}] missing id`);
  }
  if (!snapshot.type) {
    throw new RestorationError(`Memory[${index}] missing type`);
  }
  if (!snapshot.content) {
    throw new RestorationError(`Memory[${index}] missing content`);
  }
  if (typeof snapshot.confidence !== 'number') {
    throw new RestorationError(`Memory[${index}] missing confidence`);
  }
  if (!snapshot.createdAt) {
    throw new RestorationError(`Memory[${index}] missing createdAt`);
  }
  if (!snapshot.lastReinforcedAt) {
    throw new RestorationError(`Memory[${index}] missing lastReinforcedAt`);
  }
  if (!snapshot.lastDecayAt) {
    throw new RestorationError(`Memory[${index}] missing lastDecayAt`);
  }
  if (!Array.isArray(snapshot.tags)) {
    throw new RestorationError(`Memory[${index}] missing tags array`);
  }
}

/**
 * Validate failure snapshot has all required fields for restoration
 */
function validateFailureSnapshot(snapshot: FailureSnapshot, index: number): void {
  if (!snapshot.id) {
    throw new RestorationError(`Failure[${index}] missing id`);
  }
  if (!snapshot.pattern) {
    throw new RestorationError(`Failure[${index}] missing pattern`);
  }
  if (!snapshot.context) {
    throw new RestorationError(`Failure[${index}] missing context`);
  }
  if (!snapshot.severity) {
    throw new RestorationError(`Failure[${index}] missing severity`);
  }
  if (!snapshot.reason) {
    throw new RestorationError(`Failure[${index}] missing reason`);
  }
  if (!snapshot.createdAt) {
    throw new RestorationError(`Failure[${index}] missing createdAt`);
  }
  if (!snapshot.lastOccurredAt) {
    throw new RestorationError(`Failure[${index}] missing lastOccurredAt`);
  }
  if (!Array.isArray(snapshot.tags)) {
    throw new RestorationError(`Failure[${index}] missing tags array`);
  }
}

/**
 * Validate entire state snapshot for deterministic restoration
 */
function validateStateSnapshot(snapshot: StateSnapshot): void {
  if (snapshot.identity !== null) {
    validateIdentitySnapshot(snapshot.identity);
  }

  for (let i = 0; i < snapshot.memories.length; i++) {
    validateMemorySnapshot(snapshot.memories[i], i);
  }

  for (let i = 0; i < snapshot.failures.length; i++) {
    validateFailureSnapshot(snapshot.failures[i], i);
  }
}

/**
 * Convert identity snapshot to Identity object
 */
function snapshotToIdentity(snapshot: IdentitySnapshot): Identity {
  return {
    createdAt: snapshot.createdAt,
    description: snapshot.description,
    id: snapshot.id,
    invariants: snapshot.invariants.map((inv) => ({
      description: inv.description,
      id: inv.id,
      rationale: inv.rationale,
      rule: inv.rule,
    })),
    name: snapshot.name,
    riskPosture: snapshot.riskPosture as RiskPosture,
    styleConstraints: snapshot.styleConstraints.map((sc) => ({
      aspect: sc.aspect,
      constraint: sc.constraint,
      id: sc.id,
    })),
    updatedAt: snapshot.updatedAt,
    values: snapshot.values.map((v) => ({
      description: v.description,
      id: v.id,
      name: v.name,
      priority: v.priority,
    })),
    version: snapshot.version,
  };
}

/**
 * Convert memory snapshot to DistilledMemory object
 */
function snapshotToMemory(snapshot: MemorySnapshot): DistilledMemory {
  return {
    confidence: snapshot.confidence,
    content: snapshot.content,
    createdAt: snapshot.createdAt,
    decayFactor: snapshot.decayFactor,
    id: snapshot.id,
    lastDecayAt: snapshot.lastDecayAt,
    lastReinforcedAt: snapshot.lastReinforcedAt,
    reinforcementCount: snapshot.reinforcementCount,
    sourceContext: snapshot.sourceContext,
    tags: [...snapshot.tags],
    type: snapshot.type as MemoryType,
  };
}

/**
 * Convert failure snapshot to FailurePattern object
 */
function snapshotToFailure(snapshot: FailureSnapshot): FailurePattern {
  return {
    active: snapshot.active,
    context: snapshot.context,
    createdAt: snapshot.createdAt,
    id: snapshot.id,
    lastOccurredAt: snapshot.lastOccurredAt,
    occurrenceCount: snapshot.occurrenceCount,
    pattern: snapshot.pattern,
    reason: snapshot.reason,
    severity: snapshot.severity as FailureSeverity,
    tags: [...snapshot.tags],
  };
}

/**
 * Restore Cortex state from a snapshot
 *
 * Creates a fresh Cortex instance with state pre-populated from the snapshot.
 * Restoration order: Identity → Failure patterns → Distilled memory.
 *
 * @param snapshot - Complete state snapshot to restore
 * @returns Cortex instance with restored state and the identity ID (if any)
 * @throws RestorationError if snapshot data is incomplete
 */
export async function restoreFromSnapshot(
  snapshot: StateSnapshot
): Promise<{ cortex: Cortex; identityId: string | null }> {
  // Strict validation - fail if data is incomplete
  validateStateSnapshot(snapshot);

  // Create fresh storage instances
  const identityStorage = new InMemoryIdentityStorage();
  const memoryStorage = new InMemoryDistilledStorage();
  const failureStorage = new InMemoryFailureStorage();

  let identityId: string | null = null;

  // Restore identity first
  if (snapshot.identity !== null) {
    const identity = snapshotToIdentity(snapshot.identity);
    await identityStorage.save(identity);
    identityId = identity.id;

    // Create version snapshot for audit trail
    const version: IdentityVersion = {
      changeReason: 'restored',
      createdAt: snapshot.identity.createdAt,
      identityId: identity.id,
      snapshot: identity,
      version: identity.version,
    };
    await identityStorage.saveVersion(version);
  }

  // Restore failure patterns second
  for (const failureSnapshot of snapshot.failures) {
    const failure = snapshotToFailure(failureSnapshot);
    await failureStorage.save(failure);
  }

  // Restore memories third
  for (const memorySnapshot of snapshot.memories) {
    const memory = snapshotToMemory(memorySnapshot);
    await memoryStorage.save(memory);
  }

  // Create similarity provider
  const similarityProvider = new ExactMatchSimilarityProvider();

  // Create services with pre-populated storage
  const identityService = new IdentityService(identityStorage);
  const memoryService = new DistilledMemoryService(memoryStorage, similarityProvider);
  const failureService = new FailureMemoryService(failureStorage, similarityProvider);

  // Create Cortex from services
  const cortex = Cortex.fromServices(identityService, memoryService, failureService);

  return { cortex, identityId };
}

