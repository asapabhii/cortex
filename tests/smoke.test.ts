/**
 * Smoke Test
 *
 * Minimal test to verify the module loads correctly.
 * This will be replaced with comprehensive tests as modules are implemented.
 */

import { describe, expect, it } from 'vitest';

import { VERSION } from '../src/index.js';

describe('Cortex', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
  });
});

