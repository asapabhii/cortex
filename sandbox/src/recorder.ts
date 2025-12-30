/**
 * Run Recorder
 *
 * Save and load sandbox runs for replay and determinism validation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { RecordedRun, SandboxOutput } from './types.js';

/**
 * Create a recorded run from a sandbox output
 */
export function createRecordedRun(output: SandboxOutput): RecordedRun {
  return {
    id: randomUUID(),
    input: output.input,
    output,
    stateBefore: output.stateBefore,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Save a recorded run to disk
 */
export function saveRun(run: RecordedRun, filePath: string): void {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(run, null, 2);
  fs.writeFileSync(absolutePath, content, 'utf-8');
}

/**
 * Load a recorded run from disk
 */
export function loadRun(filePath: string): RecordedRun {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Run file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = JSON.parse(content) as unknown;

  // Validate structure
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid run file: not an object');
  }

  const run = parsed as Record<string, unknown>;

  if (typeof run.id !== 'string') {
    throw new Error('Invalid run file: missing id');
  }

  if (typeof run.timestamp !== 'string') {
    throw new Error('Invalid run file: missing timestamp');
  }

  if (typeof run.input !== 'object' || run.input === null) {
    throw new Error('Invalid run file: missing input');
  }

  if (typeof run.output !== 'object' || run.output === null) {
    throw new Error('Invalid run file: missing output');
  }

  if (typeof run.stateBefore !== 'object' || run.stateBefore === null) {
    throw new Error('Invalid run file: missing stateBefore');
  }

  return parsed as RecordedRun;
}

