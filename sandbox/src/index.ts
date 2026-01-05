/**
 * Cortex Sandbox
 *
 * Developer tool for observing and replaying Cortex behavior.
 */

export {
  ComparisonResult,
  DecisionDetails,
  Difference,
  FailureSnapshot,
  IdentitySnapshot,
  InvariantSnapshot,
  MemorySnapshot,
  RecordedRun,
  ReplayResult,
  SandboxInputSpec,
  SandboxOutput,
  StateSnapshot,
  StyleConstraintSnapshot,
  validateInputSpec,
  ValidationResult,
  ValueSnapshot,
} from './types.js';

export {
  captureFailureSnapshots,
  captureIdentitySnapshot,
  captureMemorySnapshots,
  captureStateSnapshot,
} from './snapshot.js';

export { SandboxRunner } from './runner.js';

export { compareOutputs } from './comparator.js';

export {
  createRecordedRun,
  loadRun,
  saveRun,
} from './recorder.js';

export {
  restoreFromSnapshot,
  RestorationError,
} from './restore.js';
