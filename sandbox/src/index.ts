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
  MemorySnapshot,
  RecordedRun,
  ReplayResult,
  SandboxInputSpec,
  SandboxOutput,
  StateSnapshot,
  validateInputSpec,
  ValidationResult,
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
