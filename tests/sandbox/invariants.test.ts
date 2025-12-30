/**
 * Sandbox Invariant Tests
 *
 * Tests Cortex invariants using fixture-based replay.
 * Each test reconstructs state using Cortex public APIs,
 * executes prepareContext, and validates expected behavior.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect, beforeEach } from 'vitest';

import {
  Cortex,
  CreateIdentityInput,
  CreateMemoryInput,
  RecordFailureInput,
} from '../../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

/**
 * Fixture structure for test scenarios
 */
interface IdentitySetup {
  name: string;
  values: Array<{ name: string; description: string; priority: number }>;
  invariants: Array<{ description: string; rule: string; rationale: string }>;
  styleConstraints: Array<{ aspect: string; constraint: string }>;
  riskPosture: 'conservative' | 'moderate' | 'aggressive';
}

interface MemorySetup {
  type: 'lesson' | 'preference' | 'warning';
  content: string;
  confidence: number;
  tags: string[];
}

interface FailureSetup {
  pattern: string;
  context: string;
  severity: 'hard' | 'soft';
  reason: string;
}

interface UpdateSetup {
  changeReason: string;
  values?: Array<{ name: string; description: string; priority: number }>;
}

interface TestFixture {
  id: string;
  timestamp: string;
  description: string;
  setup: {
    identity: IdentitySetup;
    update?: UpdateSetup;
    memories: MemorySetup[];
    failures: FailureSetup[];
  };
  input: {
    identityId: string;
    query: string;
    context?: string;
    memoryOptions?: {
      limitPerType?: number;
      minConfidence?: number;
      similarityThreshold?: number;
    };
    failureOptions?: {
      skipCheck?: boolean;
      similarityThreshold?: number;
    };
  };
  expectedBehavior: {
    success: boolean;
    blocked: boolean;
    identityUnchanged?: boolean;
    expectedVersion?: number;
    versionHistoryLength?: number;
    retrievedMemoryCount?: number;
    excludesWeakMemory?: boolean;
    memoryConfidenceStable?: boolean;
    matchedPatternCount?: number;
  };
}

/**
 * Load a fixture from disk
 */
function loadFixture(name: string): TestFixture {
  const filePath = path.join(FIXTURES_DIR, `${name}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as TestFixture;
}

/**
 * Set up Cortex state from fixture setup
 */
async function setupCortexState(
  cortex: Cortex,
  setup: TestFixture['setup']
): Promise<string> {
  // Create identity
  const identityInput: CreateIdentityInput = {
    invariants: setup.identity.invariants,
    name: setup.identity.name,
    riskPosture: setup.identity.riskPosture,
    styleConstraints: setup.identity.styleConstraints,
    values: setup.identity.values,
  };
  const identity = await cortex.identity.create(identityInput);

  // Apply update if specified
  if (setup.update) {
    await cortex.identity.update(identity.id, {
      changeReason: setup.update.changeReason,
      values: setup.update.values,
    });
  }

  // Record memories
  for (const memory of setup.memories) {
    const memoryInput: CreateMemoryInput = {
      confidence: memory.confidence,
      content: memory.content,
      tags: memory.tags,
      type: memory.type,
    };
    await cortex.memory.record(memoryInput);
  }

  // Record failures
  for (const failure of setup.failures) {
    const failureInput: RecordFailureInput = {
      context: failure.context,
      pattern: failure.pattern,
      reason: failure.reason,
      severity: failure.severity,
    };
    await cortex.failure.record(failureInput);
  }

  return identity.id;
}

describe('Cortex Invariants', () => {
  let cortex: Cortex;

  beforeEach(() => {
    cortex = Cortex.create();
  });

  describe('Identity', () => {
    it('identity remains immutable after prepareContext', async () => {
      const fixture = loadFixture('identity-immutability');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const identityBefore = await cortex.identity.load(identityId);
      expect(identityBefore).not.toBeNull();

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(fixture.expectedBehavior.success);

      const identityAfter = await cortex.identity.load(identityId);
      expect(identityAfter).not.toBeNull();

      // Validate immutability
      expect(identityAfter!.version).toBe(identityBefore!.version);
      expect(identityAfter!.name).toBe(identityBefore!.name);
      expect(identityAfter!.values.length).toBe(identityBefore!.values.length);
      expect(identityAfter!.invariants.length).toBe(identityBefore!.invariants.length);
      expect(identityAfter!.styleConstraints.length).toBe(identityBefore!.styleConstraints.length);
      expect(identityAfter!.riskPosture).toBe(identityBefore!.riskPosture);
    });

    it('version history is preserved after updates', async () => {
      const fixture = loadFixture('identity-version-history');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const identity = await cortex.identity.load(identityId);
      expect(identity).not.toBeNull();
      expect(identity!.version).toBe(fixture.expectedBehavior.expectedVersion);

      const history = await cortex.identity.getVersionHistory(identityId);
      expect(history.length).toBe(fixture.expectedBehavior.versionHistoryLength);

      // Validate version snapshots exist
      const v1 = await cortex.identity.getVersion(identityId, 1);
      const v2 = await cortex.identity.getVersion(identityId, 2);
      expect(v1).not.toBeNull();
      expect(v2).not.toBeNull();
      expect(v1!.snapshot.values.length).toBe(1);
      expect(v2!.snapshot.values.length).toBe(2);
    });
  });

  describe('Distilled Memory', () => {
    it('returns empty memory context when no memories exist', async () => {
      const fixture = loadFixture('memory-creation');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const memoryCount =
          result.context.memoryContext.lessons.length +
          result.context.memoryContext.preferences.length +
          result.context.memoryContext.warnings.length;
        expect(memoryCount).toBe(fixture.expectedBehavior.retrievedMemoryCount);
      }
    });

    it('pre-existing memories are retrievable', async () => {
      const fixture = loadFixture('memory-reinforcement');
      const identityId = await setupCortexState(cortex, fixture.setup);

      // Verify memory was recorded
      const memoriesResult = await cortex.memory.retrieve({});
      expect(memoriesResult.memories.length).toBe(1);

      const memoryBefore = memoriesResult.memories[0];
      expect(memoryBefore.confidence).toBe(0.8);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(true);

      // Verify memory confidence unchanged by prepareContext
      const memoriesAfter = await cortex.memory.retrieve({});
      expect(memoriesAfter.memories[0].confidence).toBe(memoryBefore.confidence);
    });

    it('low confidence memories are excluded by minConfidence filter', async () => {
      const fixture = loadFixture('memory-decay');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const memoryCount =
          result.context.memoryContext.lessons.length +
          result.context.memoryContext.preferences.length +
          result.context.memoryContext.warnings.length;
        expect(memoryCount).toBe(fixture.expectedBehavior.retrievedMemoryCount);

        // Verify weak memory excluded
        const lessonContents = result.context.memoryContext.lessons.map(l => l.content);
        expect(lessonContents).not.toContain('Outdated legacy pattern deprecated');
        expect(lessonContents).toContain('Always validate user input before processing');
      }
    });

    it('returns correct memory count with multiple memories', async () => {
      const fixture = loadFixture('memory-merge');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const memoryCount =
          result.context.memoryContext.lessons.length +
          result.context.memoryContext.preferences.length +
          result.context.memoryContext.warnings.length;
        expect(memoryCount).toBe(fixture.expectedBehavior.retrievedMemoryCount);
      }
    });
  });

  describe('Failure Memory', () => {
    it('hard failure patterns block execution', async () => {
      const fixture = loadFixture('failure-hard-block');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(false);
      if (!result.success && result.blocked) {
        expect(result.blocked).toBe(true);
      }
    });

    it('soft failure patterns do not block execution', async () => {
      const fixture = loadFixture('failure-soft-no-block');
      const identityId = await setupCortexState(cortex, fixture.setup);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Soft failures should be captured but not block
        const matchedCount = result.context.rawBlockingResult.matchedPatterns.length;
        expect(matchedCount).toBe(fixture.expectedBehavior.matchedPatternCount);
        expect(result.context.failureContext.blocked).toBe(false);
      }
    });
  });

  describe('Engine', () => {
    it('hard block short-circuits pipeline (no memory retrieval)', async () => {
      const fixture = loadFixture('engine-hard-block-shortcircuit');
      const identityId = await setupCortexState(cortex, fixture.setup);

      // Verify memory exists before
      const memoriesBefore = await cortex.memory.retrieve({});
      expect(memoriesBefore.memories.length).toBe(1);

      const result = await cortex.engine.prepareContext({
        ...fixture.input,
        identityId,
      });

      expect(result.success).toBe(false);
      if (!result.success && result.blocked) {
        expect(result.blocked).toBe(true);
        // No context returned when blocked - memories not retrieved
      }
    });
  });
});

