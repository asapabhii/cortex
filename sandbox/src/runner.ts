/**
 * Sandbox Runner
 *
 * Executes sandbox runs against an isolated Cortex instance.
 * Captures state before and after execution for inspection.
 */

import { Cortex } from 'cortex';

import { captureStateSnapshot } from './snapshot.js';
import {
  DecisionDetails,
  SandboxInputSpec,
  SandboxOutput,
} from './types.js';

/**
 * Sandbox Runner
 *
 * Creates isolated Cortex instances and executes deterministic runs.
 * All state is captured for inspection and replay validation.
 */
export class SandboxRunner {
  private cortex: Cortex;

  /**
   * Create a sandbox runner
   *
   * @param cortex - Optional pre-configured Cortex instance for deterministic replay.
   *                 If not provided, creates a fresh in-memory instance.
   */
  constructor(cortex?: Cortex) {
    this.cortex = cortex ?? Cortex.create();
  }

  /**
   * Get the underlying Cortex instance
   *
   * Allows direct access for pre-populating state before runs.
   */
  getCortex(): Cortex {
    return this.cortex;
  }

  /**
   * Reset to a fresh Cortex instance
   *
   * Creates a new in-memory instance, discarding all previous state.
   */
  reset(): void {
    this.cortex = Cortex.create();
  }

  /**
   * Execute a sandbox run
   *
   * Captures state before and after, executes prepareContext,
   * and returns structured output for inspection.
   */
  async run(input: SandboxInputSpec): Promise<SandboxOutput> {
    const startTime = Date.now();

    try {
      // Capture state before execution
      const stateBefore = await captureStateSnapshot(this.cortex, input.identityId);

      // Execute prepareContext
      const result = await this.cortex.engine.prepareContext({
        context: input.context,
        failureOptions: input.failureOptions ? {
          similarityThreshold: input.failureOptions.similarityThreshold,
          skipCheck: input.failureOptions.skipCheck,
        } : undefined,
        identityId: input.identityId,
        memoryOptions: input.memoryOptions ? {
          limitPerType: input.memoryOptions.limitPerType,
          minConfidence: input.memoryOptions.minConfidence,
          similarityThreshold: input.memoryOptions.similarityThreshold,
        } : undefined,
        query: input.query,
      });

      // Capture state after execution
      const stateAfter = await captureStateSnapshot(this.cortex, input.identityId);

      // Build decision details based on result type
      let decision: DecisionDetails;

      if (result.success) {
        // Context preparation succeeded
        decision = {
          blocked: false,
          matchedPatternCount: result.context.rawBlockingResult.matchedPatterns.length,
          retrievedMemoryCount: (
            result.context.memoryContext.lessons.length +
            result.context.memoryContext.preferences.length +
            result.context.memoryContext.warnings.length
          ),
        };
      } else if (result.blocked) {
        // Context preparation was blocked
        decision = {
          blocked: true,
          blockReason: result.reason,
          matchedPatternCount: result.matchedPatterns.length,
          retrievedMemoryCount: 0,
        };
      } else {
        // Context preparation failed with error
        throw new Error(result.error);
      }

      const durationMs = Date.now() - startTime;

      return {
        decision,
        durationMs,
        input,
        stateAfter,
        stateBefore,
        success: true,
      };
    } catch (err) {
      const stateAfter = await captureStateSnapshot(this.cortex, input.identityId);
      const stateBefore = stateAfter; // Best effort if error occurs early
      const durationMs = Date.now() - startTime;

      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        decision: {
          blocked: false,
          matchedPatternCount: 0,
          retrievedMemoryCount: 0,
        },
        durationMs,
        error: errorMessage,
        input,
        stateAfter,
        stateBefore,
        success: false,
      };
    }
  }
}
