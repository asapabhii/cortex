#!/usr/bin/env node

/**
 * Cortex Sandbox CLI
 *
 * Entry point for the sandbox tool.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { compareOutputs } from './comparator.js';
import { createRecordedRun, loadRun, saveRun } from './recorder.js';
import { restoreFromSnapshot, RestorationError } from './restore.js';
import { SandboxRunner } from './runner.js';
import { ReplayResult, SandboxInputSpec, validateInputSpec } from './types.js';

/**
 * Print usage information
 */
function printUsage(): void {
  process.stderr.write(`
Usage: cortex-sandbox <command> [options]

Commands:
  run <input-file>                      Execute a sandbox run
  record <input-file> --output <file>   Execute and save run for replay
  replay <run-file>                     Replay a recorded run and validate determinism

Options:
  --help                                Show this help message
  --output <file>                       Output file for record command

Exit codes:
  0  Success (or deterministic replay)
  1  Error or non-deterministic replay
`);
}

/**
 * Read and parse input file
 */
function readInputFile(filePath: string): SandboxInputSpec {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    process.stderr.write(`Error: File not found: ${absolutePath}\n`);
    process.exit(1);
  }

  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    process.stderr.write(`Error: Failed to read file: ${absolutePath}\n`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    process.stderr.write(`Error: Invalid JSON in file: ${absolutePath}\n`);
    process.exit(1);
  }

  const validation = validateInputSpec(parsed);
  if (!validation.valid) {
    process.stderr.write(`Error: Invalid input specification:\n`);
    for (const error of validation.errors) {
      process.stderr.write(`  - ${error}\n`);
    }
    process.exit(1);
  }

  return parsed as SandboxInputSpec;
}

/**
 * Execute a sandbox run
 */
async function executeRun(inputFile: string): Promise<void> {
  const input = readInputFile(inputFile);

  const runner = new SandboxRunner();
  const output = await runner.run(input);

  process.stdout.write(JSON.stringify(output, null, 2));
  process.stdout.write('\n');

  if (!output.success) {
    process.exit(1);
  }
}

/**
 * Execute and record a sandbox run
 */
async function executeRecord(inputFile: string, outputFile: string): Promise<void> {
  const input = readInputFile(inputFile);

  const runner = new SandboxRunner();
  const output = await runner.run(input);

  if (!output.success) {
    process.stderr.write(`Error: Run failed: ${output.error}\n`);
    process.exit(1);
  }

  const run = createRecordedRun(output);
  saveRun(run, outputFile);

  process.stdout.write(JSON.stringify({ recorded: true, runId: run.id }, null, 2));
  process.stdout.write('\n');
}

/**
 * Replay a recorded run and validate determinism
 *
 * Restores state from stateBefore, then re-executes input.
 * Fails if state cannot be restored or output differs.
 */
async function executeReplay(runFile: string): Promise<void> {
  let recordedRun;
  try {
    recordedRun = loadRun(runFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }

  // Restore state from snapshot
  let cortex;
  try {
    const restored = await restoreFromSnapshot(recordedRun.stateBefore);
    cortex = restored.cortex;
  } catch (err) {
    if (err instanceof RestorationError) {
      process.stderr.write(`Error: Cannot restore state for deterministic replay: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  // Run with restored state
  const runner = new SandboxRunner(cortex);
  const replayOutput = await runner.run(recordedRun.input);

  const comparison = compareOutputs(recordedRun.output, replayOutput);

  const result: ReplayResult = {
    comparison,
    recordedRun,
    replayOutput,
  };

  process.stdout.write(JSON.stringify({
    comparison: result.comparison,
    deterministic: comparison.identical,
    originalRunId: recordedRun.id,
    originalTimestamp: recordedRun.timestamp,
  }, null, 2));
  process.stdout.write('\n');

  if (!comparison.identical) {
    process.exit(1);
  }
}

/**
 * Parse --output argument
 */
function parseOutputArg(args: string[]): string | null {
  const outputIndex = args.indexOf('--output');
  if (outputIndex === -1 || outputIndex + 1 >= args.length) {
    return null;
  }
  return args[outputIndex + 1];
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    process.exit(args.includes('--help') ? 0 : 1);
  }

  const command = args[0];

  if (command === 'run') {
    if (args.length < 2) {
      process.stderr.write('Error: Missing input file argument\n');
      printUsage();
      process.exit(1);
    }
    await executeRun(args[1]);
  } else if (command === 'record') {
    if (args.length < 2) {
      process.stderr.write('Error: Missing input file argument\n');
      printUsage();
      process.exit(1);
    }
    const outputFile = parseOutputArg(args);
    if (outputFile === null) {
      process.stderr.write('Error: Missing --output argument\n');
      printUsage();
      process.exit(1);
    }
    await executeRecord(args[1], outputFile);
  } else if (command === 'replay') {
    if (args.length < 2) {
      process.stderr.write('Error: Missing run file argument\n');
      printUsage();
      process.exit(1);
    }
    await executeReplay(args[1]);
  } else {
    process.stderr.write(`Error: Unknown command: ${command}\n`);
    printUsage();
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
