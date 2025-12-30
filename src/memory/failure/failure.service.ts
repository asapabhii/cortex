/**
 * Failure Memory Service
 *
 * Core service for failure-first learning.
 * Records failures, matches patterns, and provides blocking checks.
 */

import { v4 as uuidv4 } from 'uuid';

import { SimilarityProvider } from '../../interfaces/similarity.js';
import {
  BlockCheckResult,
  DEFAULT_FAILURE_CONFIG,
  FailureMemoryConfig,
  FailurePattern,
  FailureQuery,
  RecordFailureInput,
  validateRecordFailureInput,
} from './types.js';

/**
 * Storage interface for failure pattern persistence
 */
export interface FailureMemoryStorage {
  /** Save a pattern (insert or update) */
  save(pattern: FailurePattern): Promise<void>;

  /** Load a pattern by ID */
  load(id: string): Promise<FailurePattern | null>;

  /** List all patterns */
  listAll(): Promise<FailurePattern[]>;

  /** Delete a pattern by ID */
  delete(id: string): Promise<void>;

  /** Find active patterns by severity */
  findBySeverity(severity: string): Promise<FailurePattern[]>;

  /** Find patterns that have all specified tags */
  findByTags(tags: string[]): Promise<FailurePattern[]>;
}

/**
 * In-memory storage implementation
 */
export class InMemoryFailureStorage implements FailureMemoryStorage {
  private patterns: Map<string, FailurePattern> = new Map();

  delete(id: string): Promise<void> {
    this.patterns.delete(id);
    return Promise.resolve();
  }

  findBySeverity(severity: string): Promise<FailurePattern[]> {
    const results: FailurePattern[] = [];
    for (const pattern of this.patterns.values()) {
      if (pattern.severity === severity && pattern.active) {
        results.push(pattern);
      }
    }
    return Promise.resolve(results);
  }

  findByTags(tags: string[]): Promise<FailurePattern[]> {
    const results: FailurePattern[] = [];
    for (const pattern of this.patterns.values()) {
      const hasAllTags = tags.every((tag) => pattern.tags.includes(tag));
      if (hasAllTags) {
        results.push(pattern);
      }
    }
    return Promise.resolve(results);
  }

  listAll(): Promise<FailurePattern[]> {
    return Promise.resolve(Array.from(this.patterns.values()));
  }

  load(id: string): Promise<FailurePattern | null> {
    return Promise.resolve(this.patterns.get(id) ?? null);
  }

  save(pattern: FailurePattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);
    return Promise.resolve();
  }
}

/**
 * Failure Memory Service
 *
 * Provides deterministic failure pattern management with blocking capabilities.
 * All matching uses the pluggable similarity interface.
 */
export class FailureMemoryService {
  private readonly config: FailureMemoryConfig;

  constructor(
    private readonly storage: FailureMemoryStorage,
    private readonly similarityProvider: SimilarityProvider,
    config?: Partial<FailureMemoryConfig>
  ) {
    this.config = {
      ...DEFAULT_FAILURE_CONFIG,
      ...config,
    };
  }

  /**
   * Activate a previously deactivated pattern
   */
  async activate(id: string): Promise<FailurePattern> {
    const pattern = await this.storage.load(id);
    if (pattern === null) {
      throw new Error(`Failure pattern not found: ${id}`);
    }

    const updated: FailurePattern = {
      ...pattern,
      active: true,
    };

    await this.storage.save(updated);
    return updated;
  }

  /**
   * Check if text should be blocked based on recorded failure patterns
   *
   * This should be called BEFORE LLM calls to prevent known bad patterns.
   * Returns explicit information about why blocking occurred.
   *
   * @param text - The text to check
   * @param context - Optional context for more precise matching
   * @returns BlockCheckResult with blocking decision and matched patterns
   */
  async checkBlocking(text: string, context?: string): Promise<BlockCheckResult> {
    const allPatterns = await this.storage.listAll();
    const activePatterns = allPatterns.filter((p) => p.active);

    if (activePatterns.length === 0) {
      return {
        blocked: false,
        matchedPatterns: [],
        severity: null,
      };
    }

    const matchedPatterns: FailurePattern[] = [];

    // Check each pattern for similarity match
    for (const pattern of activePatterns) {
      // Check pattern similarity
      const patternScore = await this.similarityProvider.computeSimilarity(
        text,
        pattern.pattern
      );

      // Check context similarity if context provided
      let contextScore = 0;
      if (context !== undefined) {
        contextScore = await this.similarityProvider.computeSimilarity(
          context,
          pattern.context
        );
      }

      // Use the higher of pattern or combined score
      const effectiveScore = context !== undefined
        ? Math.max(patternScore, (patternScore + contextScore) / 2)
        : patternScore;

      if (effectiveScore >= this.config.blockingThreshold) {
        matchedPatterns.push(pattern);
      }
    }

    if (matchedPatterns.length === 0) {
      return {
        blocked: false,
        matchedPatterns: [],
        severity: null,
      };
    }

    // Determine if any hard blocks exist
    const hasHardBlock = matchedPatterns.some((p) => p.severity === 'hard');

    // Sort by occurrence count (most frequent first) for explainability
    matchedPatterns.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    return {
      blocked: hasHardBlock,
      matchedPatterns,
      severity: hasHardBlock ? 'hard' : 'soft',
    };
  }

  /**
   * Deactivate a pattern without deleting
   *
   * Useful for temporarily disabling a pattern.
   */
  async deactivate(id: string): Promise<FailurePattern> {
    const pattern = await this.storage.load(id);
    if (pattern === null) {
      throw new Error(`Failure pattern not found: ${id}`);
    }

    const updated: FailurePattern = {
      ...pattern,
      active: false,
    };

    await this.storage.save(updated);
    return updated;
  }

  /**
   * Delete a failure pattern permanently
   */
  async delete(id: string): Promise<void> {
    const existing = await this.storage.load(id);
    if (existing === null) {
      throw new Error(`Failure pattern not found: ${id}`);
    }
    await this.storage.delete(id);
  }

  /**
   * Get all patterns that match the given text
   *
   * Does not block - returns all matching patterns for inspection.
   * Useful for understanding what patterns might affect a given input.
   */
  async getMatchingPatterns(text: string): Promise<FailurePattern[]> {
    const allPatterns = await this.storage.listAll();
    const activePatterns = allPatterns.filter((p) => p.active);

    if (activePatterns.length === 0) {
      return [];
    }

    const patternTexts = activePatterns.map((p) => p.pattern);
    const matches = await this.similarityProvider.findSimilar(
      text,
      patternTexts,
      this.config.blockingThreshold
    );

    return matches.map((match) => activePatterns[match.index]);
  }

  /**
   * Load a pattern by ID
   */
  async load(id: string): Promise<FailurePattern | null> {
    return this.storage.load(id);
  }

  /**
   * Record a failure pattern
   *
   * If a similar pattern already exists, increments its occurrence count.
   * Otherwise creates a new pattern.
   */
  async record(input: RecordFailureInput): Promise<FailurePattern> {
    const validation = validateRecordFailureInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid failure input: ${validation.errors.join('; ')}`);
    }

    // Check for similar existing patterns
    const existingPatterns = await this.storage.listAll();
    const existingTexts = existingPatterns.map((p) => p.pattern);

    if (existingTexts.length > 0) {
      const similar = await this.similarityProvider.findSimilar(
        input.pattern,
        existingTexts,
        this.config.duplicateThreshold
      );

      if (similar.length > 0) {
        // Increment occurrence count of most similar pattern
        const mostSimilar = similar[0];
        const existing = existingPatterns[mostSimilar.index];
        const now = new Date().toISOString();

        // Upgrade severity if new input is harder
        const newSeverity = input.severity === 'hard' ? 'hard' : existing.severity;

        const updated: FailurePattern = {
          ...existing,
          active: true, // Reactivate if was deactivated
          lastOccurredAt: now,
          occurrenceCount: existing.occurrenceCount + 1,
          severity: newSeverity,
        };

        await this.storage.save(updated);
        return updated;
      }
    }

    // Create new pattern
    const now = new Date().toISOString();
    const pattern: FailurePattern = {
      active: true,
      context: input.context.trim(),
      createdAt: now,
      id: uuidv4(),
      lastOccurredAt: now,
      occurrenceCount: 1,
      pattern: input.pattern.trim(),
      reason: input.reason.trim(),
      severity: input.severity,
      tags: (input.tags ?? []).sort(),
    };

    await this.storage.save(pattern);
    return pattern;
  }

  /**
   * Retrieve patterns matching query criteria
   */
  async retrieve(query: FailureQuery): Promise<FailurePattern[]> {
    let patterns: FailurePattern[];

    if (query.severity !== undefined) {
      patterns = await this.storage.findBySeverity(query.severity);
    } else if (query.tags !== undefined && query.tags.length > 0) {
      patterns = await this.storage.findByTags(query.tags);
    } else {
      patterns = await this.storage.listAll();
    }

    // Apply additional filters
    if (query.active !== undefined) {
      patterns = patterns.filter((p) => p.active === query.active);
    }

    if (query.tags !== undefined && query.tags.length > 0 && query.severity !== undefined) {
      patterns = patterns.filter((p) =>
        query.tags!.every((tag) => p.tags.includes(tag))
      );
    }

    if (query.minOccurrences !== undefined) {
      patterns = patterns.filter((p) => p.occurrenceCount >= query.minOccurrences!);
    }

    // Apply semantic filtering
    if (query.semanticQuery !== undefined && patterns.length > 0) {
      const threshold = query.similarityThreshold ?? this.config.blockingThreshold;
      const patternTexts = patterns.map((p) => p.pattern);

      const matches = await this.similarityProvider.findSimilar(
        query.semanticQuery,
        patternTexts,
        threshold
      );

      patterns = matches.map((match) => patterns[match.index]);
    }

    // Apply limit
    if (query.limit !== undefined && query.limit > 0) {
      patterns = patterns.slice(0, query.limit);
    }

    return patterns;
  }
}

