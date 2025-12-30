/**
 * Distilled Memory Service
 *
 * Core service for managing meaning-based long-term memory.
 * Handles recording, retrieval, reinforcement, merging, decay, and cleanup.
 */

import { v4 as uuidv4 } from 'uuid';

import { SimilarityProvider } from '../../interfaces/similarity.js';
import {
  CreateMemoryInput,
  DecayConfig,
  DEFAULT_DECAY_CONFIG,
  DistilledMemory,
  MemoryQuery,
  MemoryQueryResult,
  MergeResult,
  ReinforcementResult,
  validateCreateMemoryInput,
} from './types.js';

/**
 * Storage interface for distilled memory persistence
 */
export interface DistilledMemoryStorage {
  /** Save a memory (insert or update) */
  save(memory: DistilledMemory): Promise<void>;

  /** Load a memory by ID */
  load(id: string): Promise<DistilledMemory | null>;

  /** List all memories */
  listAll(): Promise<DistilledMemory[]>;

  /** Delete a memory by ID */
  delete(id: string): Promise<void>;

  /** Find memories by type */
  findByType(type: string): Promise<DistilledMemory[]>;

  /** Find memories that have all specified tags */
  findByTags(tags: string[]): Promise<DistilledMemory[]>;
}

/**
 * In-memory storage implementation
 *
 * Suitable for testing, development, and single-process deployments.
 * For distributed systems, use a persistent storage adapter.
 */
export class InMemoryDistilledStorage implements DistilledMemoryStorage {
  private memories: Map<string, DistilledMemory> = new Map();

  delete(id: string): Promise<void> {
    this.memories.delete(id);
    return Promise.resolve();
  }

  findByTags(tags: string[]): Promise<DistilledMemory[]> {
    const results: DistilledMemory[] = [];
    for (const memory of this.memories.values()) {
      const hasAllTags = tags.every((tag) => memory.tags.includes(tag));
      if (hasAllTags) {
        results.push(memory);
      }
    }
    return Promise.resolve(results);
  }

  findByType(type: string): Promise<DistilledMemory[]> {
    const results: DistilledMemory[] = [];
    for (const memory of this.memories.values()) {
      if (memory.type === type) {
        results.push(memory);
      }
    }
    return Promise.resolve(results);
  }

  listAll(): Promise<DistilledMemory[]> {
    return Promise.resolve(Array.from(this.memories.values()));
  }

  load(id: string): Promise<DistilledMemory | null> {
    return Promise.resolve(this.memories.get(id) ?? null);
  }

  save(memory: DistilledMemory): Promise<void> {
    this.memories.set(memory.id, memory);
    return Promise.resolve();
  }
}

/**
 * Configuration for the memory service
 */
export interface MemoryServiceConfig {
  /** Decay configuration */
  decayConfig?: DecayConfig;

  /** Similarity threshold for detecting duplicate memories (0-1) */
  duplicateThreshold?: number;

  /** Confidence boost per reinforcement (added to existing confidence) */
  reinforcementBoost?: number;

  /** Maximum confidence value (caps reinforcement) */
  maxConfidence?: number;
}

const DEFAULT_SERVICE_CONFIG: Required<MemoryServiceConfig> = {
  decayConfig: DEFAULT_DECAY_CONFIG,
  duplicateThreshold: 0.8,
  maxConfidence: 1.0,
  reinforcementBoost: 0.1,
};

/**
 * Distilled Memory Service
 *
 * Provides controlled access to memory operations with built-in
 * deduplication, reinforcement, decay, and cleanup logic.
 */
export class DistilledMemoryService {
  private readonly config: Required<MemoryServiceConfig>;

  constructor(
    private readonly storage: DistilledMemoryStorage,
    private readonly similarityProvider: SimilarityProvider,
    config?: MemoryServiceConfig
  ) {
    this.config = {
      ...DEFAULT_SERVICE_CONFIG,
      ...config,
      decayConfig: {
        ...DEFAULT_SERVICE_CONFIG.decayConfig,
        ...config?.decayConfig,
      },
    };
  }

  /**
   * Apply decay to all memories that are due for decay
   *
   * Decay reduces the decayFactor based on time since last reinforcement.
   * Memories that fall below thresholds are not deleted here - use cleanup().
   *
   * @returns Number of memories that had decay applied
   */
  async applyDecay(): Promise<number> {
    const now = Date.now();
    const memories = await this.storage.listAll();
    let decayedCount = 0;

    for (const memory of memories) {
      const lastDecay = new Date(memory.lastDecayAt).getTime();
      const timeSinceDecay = now - lastDecay;

      if (timeSinceDecay >= this.config.decayConfig.decayIntervalMs) {
        const decayCycles = Math.floor(timeSinceDecay / this.config.decayConfig.decayIntervalMs);
        const newDecayFactor = Math.max(
          0,
          memory.decayFactor - (this.config.decayConfig.decayRate * decayCycles)
        );

        const updated: DistilledMemory = {
          ...memory,
          decayFactor: newDecayFactor,
          lastDecayAt: new Date().toISOString(),
        };

        await this.storage.save(updated);
        decayedCount++;
      }
    }

    return decayedCount;
  }

  /**
   * Remove memories that have decayed below thresholds
   *
   * A memory is deleted if:
   * - confidence < deletionThreshold, OR
   * - decayFactor < decayFactorThreshold
   *
   * @returns Array of deleted memory IDs
   */
  async cleanup(): Promise<string[]> {
    const memories = await this.storage.listAll();
    const deletedIds: string[] = [];

    for (const memory of memories) {
      const effectiveStrength = memory.confidence * memory.decayFactor;
      const shouldDelete =
        memory.confidence < this.config.decayConfig.deletionThreshold ||
        memory.decayFactor < this.config.decayConfig.decayFactorThreshold ||
        effectiveStrength < this.config.decayConfig.deletionThreshold;

      if (shouldDelete) {
        await this.storage.delete(memory.id);
        deletedIds.push(memory.id);
      }
    }

    return deletedIds;
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<void> {
    const existing = await this.storage.load(id);
    if (existing === null) {
      throw new Error(`Memory not found: ${id}`);
    }
    await this.storage.delete(id);
  }

  /**
   * Load a memory by ID
   */
  async load(id: string): Promise<DistilledMemory | null> {
    return this.storage.load(id);
  }

  /**
   * Merge two similar memories into one
   *
   * The merged memory:
   * - Keeps the higher confidence
   * - Combines reinforcement counts
   * - Merges tags (union)
   * - Uses the older creation date
   * - Keeps content from higher-confidence memory
   *
   * @param keepId - ID of the memory to keep
   * @param removeId - ID of the memory to remove
   * @returns Merge result with the merged memory and removed memory
   */
  async merge(keepId: string, removeId: string): Promise<MergeResult> {
    const keep = await this.storage.load(keepId);
    const remove = await this.storage.load(removeId);

    if (keep === null) {
      throw new Error(`Memory not found: ${keepId}`);
    }
    if (remove === null) {
      throw new Error(`Memory not found: ${removeId}`);
    }

    const similarityScore = await this.similarityProvider.computeSimilarity(
      keep.content,
      remove.content
    );

    const now = new Date().toISOString();
    const mergedTags = Array.from(new Set([...keep.tags, ...remove.tags]));

    const merged: DistilledMemory = {
      ...keep,
      confidence: Math.min(
        this.config.maxConfidence,
        Math.max(keep.confidence, remove.confidence) + this.config.reinforcementBoost
      ),
      createdAt: keep.createdAt < remove.createdAt ? keep.createdAt : remove.createdAt,
      lastReinforcedAt: now,
      reinforcementCount: keep.reinforcementCount + remove.reinforcementCount + 1,
      tags: mergedTags.sort(),
    };

    await this.storage.save(merged);
    await this.storage.delete(removeId);

    return {
      merged,
      removed: remove,
      similarityScore,
    };
  }

  /**
   * Record a new memory or reinforce an existing similar one
   *
   * If a memory with similar content already exists (above duplicateThreshold),
   * that memory is reinforced instead of creating a new one.
   *
   * @param input - Memory creation input
   * @returns The created or reinforced memory
   */
  async record(input: CreateMemoryInput): Promise<DistilledMemory> {
    const validation = validateCreateMemoryInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid memory input: ${validation.errors.join('; ')}`);
    }

    // Check for similar existing memories
    const existingMemories = await this.storage.listAll();
    const existingContents = existingMemories.map((m) => m.content);

    if (existingContents.length > 0) {
      const similar = await this.similarityProvider.findSimilar(
        input.content,
        existingContents,
        this.config.duplicateThreshold
      );

      if (similar.length > 0) {
        // Reinforce the most similar existing memory
        const mostSimilar = similar[0];
        const existingMemory = existingMemories[mostSimilar.index];
        const result = await this.reinforce(existingMemory.id);
        return result.memory;
      }
    }

    // Create new memory
    const now = new Date().toISOString();
    const memory: DistilledMemory = {
      confidence: input.confidence ?? 0.5,
      content: input.content.trim(),
      createdAt: now,
      decayFactor: 1.0,
      id: uuidv4(),
      lastDecayAt: now,
      lastReinforcedAt: now,
      reinforcementCount: 0,
      sourceContext: input.sourceContext,
      tags: (input.tags ?? []).sort(),
      type: input.type,
    };

    await this.storage.save(memory);
    return memory;
  }

  /**
   * Reinforce an existing memory
   *
   * Increases confidence and reinforcement count.
   * Resets decay tracking.
   *
   * @param id - Memory ID to reinforce
   * @returns Reinforcement result with before/after values
   */
  async reinforce(id: string): Promise<ReinforcementResult> {
    const memory = await this.storage.load(id);
    if (memory === null) {
      throw new Error(`Memory not found: ${id}`);
    }

    const now = new Date().toISOString();
    const previousConfidence = memory.confidence;
    const previousReinforcementCount = memory.reinforcementCount;

    const newConfidence = Math.min(
      this.config.maxConfidence,
      memory.confidence + this.config.reinforcementBoost
    );

    const updated: DistilledMemory = {
      ...memory,
      confidence: newConfidence,
      decayFactor: 1.0, // Reset decay on reinforcement
      lastDecayAt: now,
      lastReinforcedAt: now,
      reinforcementCount: memory.reinforcementCount + 1,
    };

    await this.storage.save(updated);

    return {
      memory: updated,
      newConfidence,
      previousConfidence,
      previousReinforcementCount,
    };
  }

  /**
   * Retrieve memories matching query criteria
   *
   * Supports filtering by type, tags, confidence, and semantic similarity.
   */
  async retrieve(query: MemoryQuery): Promise<MemoryQueryResult> {
    let memories: DistilledMemory[];

    // Start with type filter if specified
    if (query.type !== undefined) {
      memories = await this.storage.findByType(query.type);
    } else if (query.tags !== undefined && query.tags.length > 0) {
      memories = await this.storage.findByTags(query.tags);
    } else {
      memories = await this.storage.listAll();
    }

    // Apply additional filters
    if (query.tags !== undefined && query.tags.length > 0 && query.type !== undefined) {
      // Tags filter not yet applied
      memories = memories.filter((m) =>
        query.tags!.every((tag) => m.tags.includes(tag))
      );
    }

    if (query.minConfidence !== undefined) {
      memories = memories.filter((m) => m.confidence >= query.minConfidence!);
    }

    // Apply semantic filtering if query provided
    if (query.semanticQuery !== undefined && memories.length > 0) {
      const threshold = query.similarityThreshold ?? 0.5;
      const contents = memories.map((m) => m.content);

      const similar = await this.similarityProvider.findSimilar(
        query.semanticQuery,
        contents,
        threshold
      );

      memories = similar.map((match) => memories[match.index]);
    }

    const totalCount = memories.length;

    // Apply limit
    if (query.limit !== undefined && query.limit > 0) {
      memories = memories.slice(0, query.limit);
    }

    return {
      memories,
      totalCount,
    };
  }
}

