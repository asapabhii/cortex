#!/usr/bin/env node

/**
 * Cortex Sandbox CLI
 *
 * Entry point for the sandbox tool.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { SandboxInputSpec, validateInputSpec } from './types.js';

/**
 * Print usage information
 */
function printUsage(): void {
  process.stderr.write(`
Usage: cortex-sandbox <command> [options]

Commands:
  run <input-file>    Execute a sandbox run with the given input specification

Options:
  --help              Show this help message

Input file must be a JSON file containing a SandboxInputSpec object.
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
  } catch (err) {
    process.stderr.write(`Error: Failed to read file: ${absolutePath}\n`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
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
 * Main entry point
 */
function main(): void {
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

    const inputFile = args[1];
    const input = readInputFile(inputFile);

    // For now, echo the parsed input
    process.stdout.write('Parsed input specification:\n');
    process.stdout.write(JSON.stringify(input, null, 2));
    process.stdout.write('\n');

    // Cortex invocation will be added in Commit 2
    process.stdout.write('\n[Sandbox runner not yet implemented]\n');
  } else {
    process.stderr.write(`Error: Unknown command: ${command}\n`);
    printUsage();
    process.exit(1);
  }
}

main();

