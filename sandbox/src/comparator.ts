/**
 * Output Comparator
 *
 * Strict comparison of sandbox outputs for determinism validation.
 * Ignores runtime-only fields (timestamps, duration).
 */

import {
  ComparisonResult,
  DecisionDetails,
  Difference,
  FailureSnapshot,
  IdentitySnapshot,
  MemorySnapshot,
  SandboxOutput,
  StateSnapshot,
} from './types.js';

/**
 * Compare two values and collect differences
 */
function compareValues(
  path: string,
  expected: unknown,
  actual: unknown,
  differences: Difference[]
): void {
  if (expected === actual) {
    return;
  }

  if (typeof expected !== typeof actual) {
    differences.push({ actual, expected, path });
    return;
  }

  if (expected === null || actual === null) {
    if (expected !== actual) {
      differences.push({ actual, expected, path });
    }
    return;
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      differences.push({
        actual: actual.length,
        expected: expected.length,
        path: `${path}.length`,
      });
    }
    const minLength = Math.min(expected.length, actual.length);
    for (let i = 0; i < minLength; i++) {
      compareValues(`${path}[${i}]`, expected[i], actual[i], differences);
    }
    return;
  }

  if (typeof expected === 'object' && typeof actual === 'object') {
    const expectedObj = expected as Record<string, unknown>;
    const actualObj = actual as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(expectedObj), ...Object.keys(actualObj)]);

    for (const key of allKeys) {
      compareValues(`${path}.${key}`, expectedObj[key], actualObj[key], differences);
    }
    return;
  }

  differences.push({ actual, expected, path });
}

/**
 * Compare identity snapshots
 */
function compareIdentity(
  expected: IdentitySnapshot | null,
  actual: IdentitySnapshot | null,
  differences: Difference[]
): void {
  if (expected === null && actual === null) {
    return;
  }

  if (expected === null || actual === null) {
    differences.push({
      actual: actual === null ? 'null' : 'present',
      expected: expected === null ? 'null' : 'present',
      path: 'identity',
    });
    return;
  }

  compareValues('identity.id', expected.id, actual.id, differences);
  compareValues('identity.name', expected.name, actual.name, differences);
  compareValues('identity.version', expected.version, actual.version, differences);
  compareValues('identity.riskPosture', expected.riskPosture, actual.riskPosture, differences);
  compareValues('identity.description', expected.description, actual.description, differences);
  // createdAt and updatedAt intentionally compared for determinism
  compareValues('identity.createdAt', expected.createdAt, actual.createdAt, differences);
  compareValues('identity.updatedAt', expected.updatedAt, actual.updatedAt, differences);
  compareValues('identity.values', expected.values, actual.values, differences);
  compareValues('identity.invariants', expected.invariants, actual.invariants, differences);
  compareValues('identity.styleConstraints', expected.styleConstraints, actual.styleConstraints, differences);
}

/**
 * Compare memory snapshots by content (order-independent)
 */
function compareMemories(
  expected: MemorySnapshot[],
  actual: MemorySnapshot[],
  basePath: string,
  differences: Difference[]
): void {
  if (expected.length !== actual.length) {
    differences.push({
      actual: actual.length,
      expected: expected.length,
      path: `${basePath}.length`,
    });
  }

  // Sort by id for stable comparison
  const sortedExpected = [...expected].sort((a, b) => a.id.localeCompare(b.id));
  const sortedActual = [...actual].sort((a, b) => a.id.localeCompare(b.id));

  const minLength = Math.min(sortedExpected.length, sortedActual.length);
  for (let i = 0; i < minLength; i++) {
    const exp = sortedExpected[i];
    const act = sortedActual[i];
    const memPath = `${basePath}[${i}]`;

    compareValues(`${memPath}.id`, exp.id, act.id, differences);
    compareValues(`${memPath}.type`, exp.type, act.type, differences);
    compareValues(`${memPath}.content`, exp.content, act.content, differences);
    compareValues(`${memPath}.confidence`, exp.confidence, act.confidence, differences);
    compareValues(`${memPath}.reinforcementCount`, exp.reinforcementCount, act.reinforcementCount, differences);
    compareValues(`${memPath}.decayFactor`, exp.decayFactor, act.decayFactor, differences);
    compareValues(`${memPath}.createdAt`, exp.createdAt, act.createdAt, differences);
    compareValues(`${memPath}.lastReinforcedAt`, exp.lastReinforcedAt, act.lastReinforcedAt, differences);
    compareValues(`${memPath}.lastDecayAt`, exp.lastDecayAt, act.lastDecayAt, differences);
    compareValues(`${memPath}.tags`, exp.tags, act.tags, differences);
    compareValues(`${memPath}.sourceContext`, exp.sourceContext, act.sourceContext, differences);
  }
}

/**
 * Compare failure snapshots by pattern (order-independent)
 */
function compareFailures(
  expected: FailureSnapshot[],
  actual: FailureSnapshot[],
  basePath: string,
  differences: Difference[]
): void {
  if (expected.length !== actual.length) {
    differences.push({
      actual: actual.length,
      expected: expected.length,
      path: `${basePath}.length`,
    });
  }

  // Sort by id for stable comparison
  const sortedExpected = [...expected].sort((a, b) => a.id.localeCompare(b.id));
  const sortedActual = [...actual].sort((a, b) => a.id.localeCompare(b.id));

  const minLength = Math.min(sortedExpected.length, sortedActual.length);
  for (let i = 0; i < minLength; i++) {
    const exp = sortedExpected[i];
    const act = sortedActual[i];
    const failPath = `${basePath}[${i}]`;

    compareValues(`${failPath}.id`, exp.id, act.id, differences);
    compareValues(`${failPath}.pattern`, exp.pattern, act.pattern, differences);
    compareValues(`${failPath}.context`, exp.context, act.context, differences);
    compareValues(`${failPath}.severity`, exp.severity, act.severity, differences);
    compareValues(`${failPath}.reason`, exp.reason, act.reason, differences);
    compareValues(`${failPath}.occurrenceCount`, exp.occurrenceCount, act.occurrenceCount, differences);
    compareValues(`${failPath}.active`, exp.active, act.active, differences);
    compareValues(`${failPath}.createdAt`, exp.createdAt, act.createdAt, differences);
    compareValues(`${failPath}.lastOccurredAt`, exp.lastOccurredAt, act.lastOccurredAt, differences);
    compareValues(`${failPath}.tags`, exp.tags, act.tags, differences);
  }
}

/**
 * Compare state snapshots (ignores timestamp)
 */
function compareState(
  expected: StateSnapshot,
  actual: StateSnapshot,
  basePath: string,
  differences: Difference[]
): void {
  compareIdentity(expected.identity, actual.identity, differences);
  compareMemories(expected.memories, actual.memories, `${basePath}.memories`, differences);
  compareFailures(expected.failures, actual.failures, `${basePath}.failures`, differences);
  // timestamp intentionally ignored
}

/**
 * Compare decision details
 */
function compareDecision(
  expected: DecisionDetails,
  actual: DecisionDetails,
  differences: Difference[]
): void {
  compareValues('decision.blocked', expected.blocked, actual.blocked, differences);
  compareValues('decision.blockReason', expected.blockReason, actual.blockReason, differences);
  compareValues('decision.matchedPatternCount', expected.matchedPatternCount, actual.matchedPatternCount, differences);
  compareValues('decision.retrievedMemoryCount', expected.retrievedMemoryCount, actual.retrievedMemoryCount, differences);
}

/**
 * Compare two sandbox outputs for determinism validation
 *
 * Ignores:
 * - timestamps (stateBefore.timestamp, stateAfter.timestamp)
 * - durationMs (runtime variance)
 *
 * Compares:
 * - success
 * - input (should be identical)
 * - stateBefore (excluding timestamp)
 * - stateAfter (excluding timestamp)
 * - decision
 * - error (if present)
 */
export function compareOutputs(
  expected: SandboxOutput,
  actual: SandboxOutput
): ComparisonResult {
  const differences: Difference[] = [];

  // Compare success
  compareValues('success', expected.success, actual.success, differences);

  // Compare input
  compareValues('input', expected.input, actual.input, differences);

  // Compare state before (excluding timestamp)
  compareState(expected.stateBefore, actual.stateBefore, 'stateBefore', differences);

  // Compare state after (excluding timestamp)
  compareState(expected.stateAfter, actual.stateAfter, 'stateAfter', differences);

  // Compare decision
  compareDecision(expected.decision, actual.decision, differences);

  // Compare error
  compareValues('error', expected.error, actual.error, differences);

  // durationMs intentionally ignored

  return {
    differences,
    identical: differences.length === 0,
  };
}

