/**
 * Cortex Facade
 *
 * High-level entry point that wires all Cortex modules together.
 * Provides a convenient API for consumers while keeping
 * lower-level services accessible for advanced use cases.
 */

import { DistilledMemoryService, InMemoryDistilledStorage, MemoryServiceConfig } from '../memory/distilled/memory.service.js';
import { FailureMemoryService, InMemoryFailureStorage } from '../memory/failure/failure.service.js';
import { FailureMemoryConfig } from '../memory/failure/types.js';
import { IdentityService, InMemoryIdentityStorage } from '../identity/identity.service.js';
import { ExactMatchSimilarityProvider, SimilarityProvider } from '../interfaces/similarity.js';
import { SQLiteDistilledStorage, SQLiteFailureStorage, SQLiteIdentityStorage } from '../storage/sqlite.js';
import { CortexEngine } from './engine.service.js';
import { CortexEngineConfig, PrepareContextInput, PrepareContextResult } from './types.js';

/**
 * Configuration options for Cortex
 */
export interface CortexOptions {
  /** Engine configuration */
  engine?: Partial<CortexEngineConfig>;

  /** Memory service configuration */
  memory?: Partial<MemoryServiceConfig>;

  /** Failure memory configuration */
  failure?: Partial<FailureMemoryConfig>;

  /** Custom similarity provider (uses deterministic provider if not specified) */
  similarityProvider?: SimilarityProvider;
}

/**
 * Cortex
 *
 * The main entry point for the Cortex cognitive infrastructure.
 * Wires together identity, memory, failure, and engine modules.
 */
export class Cortex {
  /**
   * The identity service for managing persistent identity
   */
  public readonly identity: IdentityService;

  /**
   * The distilled memory service for meaning-based memory
   */
  public readonly memory: DistilledMemoryService;

  /**
   * The failure memory service for failure-first learning
   */
  public readonly failure: FailureMemoryService;

  /**
   * The orchestration engine
   */
  public readonly engine: CortexEngine;

  private constructor(
    identity: IdentityService,
    memory: DistilledMemoryService,
    failure: FailureMemoryService,
    engine: CortexEngine
  ) {
    this.identity = identity;
    this.memory = memory;
    this.failure = failure;
    this.engine = engine;
  }

  /**
   * Create a Cortex instance with default in-memory storage
   *
   * Suitable for development, testing, and single-process deployments.
   * For production with persistence, wire services manually with custom storage.
   */
  static create(options?: CortexOptions): Cortex {
    // Create similarity provider
    const similarityProvider = options?.similarityProvider
      ?? new ExactMatchSimilarityProvider();

    // Create storage backends
    const identityStorage = new InMemoryIdentityStorage();
    const memoryStorage = new InMemoryDistilledStorage();
    const failureStorage = new InMemoryFailureStorage();

    // Create services
    const identityService = new IdentityService(identityStorage);
    const memoryService = new DistilledMemoryService(
      memoryStorage,
      similarityProvider,
      options?.memory
    );
    const failureService = new FailureMemoryService(
      failureStorage,
      similarityProvider,
      options?.failure
    );

    // Create engine
    const engine = new CortexEngine(
      identityService,
      memoryService,
      failureService,
      options?.engine
    );

    return new Cortex(identityService, memoryService, failureService, engine);
  }

  /**
   * Create a Cortex instance with SQLite persistent storage
   *
   * Async factory that initializes SQLite storage for all modules.
   * Data persists across process restarts when using a file path.
   */
  static async createWithSQLite(options?: CortexOptions): Promise<Cortex> {
    // Create similarity provider
    const similarityProvider = options?.similarityProvider
      ?? new ExactMatchSimilarityProvider();

    // Create and initialize SQLite storage backends
    const identityStorage = new SQLiteIdentityStorage();
    const memoryStorage = new SQLiteDistilledStorage();
    const failureStorage = new SQLiteFailureStorage();

    await identityStorage.initialize();
    await memoryStorage.initialize();
    await failureStorage.initialize();

    // Create services
    const identityService = new IdentityService(identityStorage);
    const memoryService = new DistilledMemoryService(
      memoryStorage,
      similarityProvider,
      options?.memory
    );
    const failureService = new FailureMemoryService(
      failureStorage,
      similarityProvider,
      options?.failure
    );

    // Create engine
    const engine = new CortexEngine(
      identityService,
      memoryService,
      failureService,
      options?.engine
    );

    return new Cortex(identityService, memoryService, failureService, engine);
  }

  /**
   * Create a Cortex instance with custom services
   *
   * Use this when you need custom storage backends or providers.
   */
  static fromServices(
    identity: IdentityService,
    memory: DistilledMemoryService,
    failure: FailureMemoryService,
    engineConfig?: Partial<CortexEngineConfig>
  ): Cortex {
    const engine = new CortexEngine(
      identity,
      memory,
      failure,
      engineConfig
    );

    return new Cortex(identity, memory, failure, engine);
  }

  /**
   * Prepare context for an LLM call
   *
   * Convenience method that delegates to the engine.
   */
  prepareContext(input: PrepareContextInput): Promise<PrepareContextResult> {
    return this.engine.prepareContext(input);
  }
}

