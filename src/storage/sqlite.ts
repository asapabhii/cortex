/**
 * SQLite Storage Implementation
 *
 * Persistent storage using sql.js (WebAssembly-based SQLite).
 * Uses explicit SQL with no ORM or migration framework.
 */

import initSqlJs, { Database } from 'sql.js';

import { DEFAULT_STORAGE_CONFIG, StorageConfig } from './types.js';
import { DistilledMemory } from '../memory/distilled/types.js';
import { DistilledMemoryStorage } from '../memory/distilled/memory.service.js';
import { FailureMemoryStorage } from '../memory/failure/failure.service.js';
import { FailurePattern } from '../memory/failure/types.js';
import { Identity, IdentityVersion } from '../identity/types.js';
import { IdentityStorage } from '../identity/identity.service.js';

/**
 * Initialize sql.js and create a database
 */
async function createDatabase(_config: StorageConfig): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  return db;
}

/**
 * SQLite storage for Identity
 */
export class SQLiteIdentityStorage implements IdentityStorage {
  private db: Database | null = null;
  private readonly config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  /**
   * Initialize the database and create tables
   */
  async initialize(): Promise<void> {
    this.db = await createDatabase(this.config);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS identities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        risk_posture TEXT NOT NULL,
        description TEXT,
        values_json TEXT NOT NULL,
        invariants_json TEXT NOT NULL,
        style_constraints_json TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS identity_versions (
        identity_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        change_reason TEXT NOT NULL,
        PRIMARY KEY (identity_id, version)
      )
    `);
  }

  private ensureInitialized(): Database {
    if (this.db === null) {
      throw new Error('SQLiteIdentityStorage not initialized. Call initialize() first.');
    }
    return this.db;
  }

  delete(id: string): Promise<void> {
    const db = this.ensureInitialized();
    db.run('DELETE FROM identity_versions WHERE identity_id = ?', [id]);
    db.run('DELETE FROM identities WHERE id = ?', [id]);
    return Promise.resolve();
  }

  getVersion(identityId: string, version: number): Promise<IdentityVersion | null> {
    const db = this.ensureInitialized();
    const stmt = db.prepare(
      'SELECT * FROM identity_versions WHERE identity_id = ? AND version = ?'
    );
    stmt.bind([identityId, version]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();

      return Promise.resolve({
        changeReason: row.change_reason as string,
        createdAt: row.created_at as string,
        identityId: row.identity_id as string,
        snapshot: JSON.parse(row.snapshot_json as string) as Identity,
        version: row.version as number,
      });
    }

    stmt.free();
    return Promise.resolve(null);
  }

  getVersions(identityId: string): Promise<IdentityVersion[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare(
      'SELECT * FROM identity_versions WHERE identity_id = ? ORDER BY version ASC'
    );
    stmt.bind([identityId]);

    const versions: IdentityVersion[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      versions.push({
        changeReason: row.change_reason as string,
        createdAt: row.created_at as string,
        identityId: row.identity_id as string,
        snapshot: JSON.parse(row.snapshot_json as string) as Identity,
        version: row.version as number,
      });
    }
    stmt.free();

    return Promise.resolve(versions);
  }

  listIds(): Promise<string[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT id FROM identities');
    const ids: string[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      ids.push(row.id as string);
    }
    stmt.free();

    return Promise.resolve(ids);
  }

  load(id: string): Promise<Identity | null> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM identities WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();

      const description = row.description as string | null;
      return Promise.resolve({
        createdAt: row.created_at as string,
        description: description ?? undefined,
        id: row.id as string,
        invariants: JSON.parse(row.invariants_json as string) as Identity['invariants'],
        name: row.name as string,
        riskPosture: row.risk_posture as Identity['riskPosture'],
        styleConstraints: JSON.parse(row.style_constraints_json as string) as Identity['styleConstraints'],
        updatedAt: row.updated_at as string,
        values: JSON.parse(row.values_json as string) as Identity['values'],
        version: row.version as number,
      });
    }

    stmt.free();
    return Promise.resolve(null);
  }

  save(identity: Identity): Promise<void> {
    const db = this.ensureInitialized();

    db.run(`
      INSERT OR REPLACE INTO identities 
      (id, name, version, created_at, updated_at, risk_posture, description, values_json, invariants_json, style_constraints_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      identity.id,
      identity.name,
      identity.version,
      identity.createdAt,
      identity.updatedAt,
      identity.riskPosture,
      identity.description ?? null,
      JSON.stringify(identity.values),
      JSON.stringify(identity.invariants),
      JSON.stringify(identity.styleConstraints),
    ]);

    return Promise.resolve();
  }

  saveVersion(version: IdentityVersion): Promise<void> {
    const db = this.ensureInitialized();

    db.run(`
      INSERT OR REPLACE INTO identity_versions
      (identity_id, version, snapshot_json, created_at, change_reason)
      VALUES (?, ?, ?, ?, ?)
    `, [
      version.identityId,
      version.version,
      JSON.stringify(version.snapshot),
      version.createdAt,
      version.changeReason,
    ]);

    return Promise.resolve();
  }
}

/**
 * SQLite storage for Distilled Memory
 */
export class SQLiteDistilledStorage implements DistilledMemoryStorage {
  private db: Database | null = null;
  private readonly config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    this.db = await createDatabase(this.config);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS distilled_memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL NOT NULL,
        reinforcement_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_reinforced_at TEXT NOT NULL,
        last_decay_at TEXT NOT NULL,
        decay_factor REAL NOT NULL,
        tags_json TEXT NOT NULL,
        source_context TEXT
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON distilled_memories(type)');
  }

  private ensureInitialized(): Database {
    if (this.db === null) {
      throw new Error('SQLiteDistilledStorage not initialized. Call initialize() first.');
    }
    return this.db;
  }

  delete(id: string): Promise<void> {
    const db = this.ensureInitialized();
    db.run('DELETE FROM distilled_memories WHERE id = ?', [id]);
    return Promise.resolve();
  }

  findByTags(tags: string[]): Promise<DistilledMemory[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM distilled_memories');
    const results: DistilledMemory[] = [];

    while (stmt.step()) {
      const memory = this.rowToMemory(stmt.getAsObject());
      const hasAllTags = tags.every((tag) => memory.tags.includes(tag));
      if (hasAllTags) {
        results.push(memory);
      }
    }
    stmt.free();

    return Promise.resolve(results);
  }

  findByType(type: string): Promise<DistilledMemory[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM distilled_memories WHERE type = ?');
    stmt.bind([type]);

    const results: DistilledMemory[] = [];
    while (stmt.step()) {
      results.push(this.rowToMemory(stmt.getAsObject()));
    }
    stmt.free();

    return Promise.resolve(results);
  }

  listAll(): Promise<DistilledMemory[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM distilled_memories');
    const results: DistilledMemory[] = [];

    while (stmt.step()) {
      results.push(this.rowToMemory(stmt.getAsObject()));
    }
    stmt.free();

    return Promise.resolve(results);
  }

  load(id: string): Promise<DistilledMemory | null> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM distilled_memories WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const memory = this.rowToMemory(stmt.getAsObject());
      stmt.free();
      return Promise.resolve(memory);
    }

    stmt.free();
    return Promise.resolve(null);
  }

  save(memory: DistilledMemory): Promise<void> {
    const db = this.ensureInitialized();

    db.run(`
      INSERT OR REPLACE INTO distilled_memories
      (id, type, content, confidence, reinforcement_count, created_at, last_reinforced_at, last_decay_at, decay_factor, tags_json, source_context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      memory.id,
      memory.type,
      memory.content,
      memory.confidence,
      memory.reinforcementCount,
      memory.createdAt,
      memory.lastReinforcedAt,
      memory.lastDecayAt,
      memory.decayFactor,
      JSON.stringify(memory.tags),
      memory.sourceContext ?? null,
    ]);

    return Promise.resolve();
  }

  private rowToMemory(row: Record<string, unknown>): DistilledMemory {
    const sourceContext = row.source_context as string | null;
    return {
      confidence: row.confidence as number,
      content: row.content as string,
      createdAt: row.created_at as string,
      decayFactor: row.decay_factor as number,
      id: row.id as string,
      lastDecayAt: row.last_decay_at as string,
      lastReinforcedAt: row.last_reinforced_at as string,
      reinforcementCount: row.reinforcement_count as number,
      sourceContext: sourceContext ?? undefined,
      tags: JSON.parse(row.tags_json as string) as string[],
      type: row.type as DistilledMemory['type'],
    };
  }
}

/**
 * SQLite storage for Failure Memory
 */
export class SQLiteFailureStorage implements FailureMemoryStorage {
  private db: Database | null = null;
  private readonly config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    this.db = await createDatabase(this.config);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS failure_patterns (
        id TEXT PRIMARY KEY,
        pattern TEXT NOT NULL,
        context TEXT NOT NULL,
        severity TEXT NOT NULL,
        occurrence_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_occurred_at TEXT NOT NULL,
        reason TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        active INTEGER NOT NULL
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_failures_severity ON failure_patterns(severity)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_failures_active ON failure_patterns(active)');
  }

  private ensureInitialized(): Database {
    if (this.db === null) {
      throw new Error('SQLiteFailureStorage not initialized. Call initialize() first.');
    }
    return this.db;
  }

  delete(id: string): Promise<void> {
    const db = this.ensureInitialized();
    db.run('DELETE FROM failure_patterns WHERE id = ?', [id]);
    return Promise.resolve();
  }

  findBySeverity(severity: string): Promise<FailurePattern[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM failure_patterns WHERE severity = ? AND active = 1');
    stmt.bind([severity]);

    const results: FailurePattern[] = [];
    while (stmt.step()) {
      results.push(this.rowToPattern(stmt.getAsObject()));
    }
    stmt.free();

    return Promise.resolve(results);
  }

  findByTags(tags: string[]): Promise<FailurePattern[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM failure_patterns');
    const results: FailurePattern[] = [];

    while (stmt.step()) {
      const pattern = this.rowToPattern(stmt.getAsObject());
      const hasAllTags = tags.every((tag) => pattern.tags.includes(tag));
      if (hasAllTags) {
        results.push(pattern);
      }
    }
    stmt.free();

    return Promise.resolve(results);
  }

  listAll(): Promise<FailurePattern[]> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM failure_patterns');
    const results: FailurePattern[] = [];

    while (stmt.step()) {
      results.push(this.rowToPattern(stmt.getAsObject()));
    }
    stmt.free();

    return Promise.resolve(results);
  }

  load(id: string): Promise<FailurePattern | null> {
    const db = this.ensureInitialized();
    const stmt = db.prepare('SELECT * FROM failure_patterns WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const pattern = this.rowToPattern(stmt.getAsObject());
      stmt.free();
      return Promise.resolve(pattern);
    }

    stmt.free();
    return Promise.resolve(null);
  }

  save(pattern: FailurePattern): Promise<void> {
    const db = this.ensureInitialized();

    db.run(`
      INSERT OR REPLACE INTO failure_patterns
      (id, pattern, context, severity, occurrence_count, created_at, last_occurred_at, reason, tags_json, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pattern.id,
      pattern.pattern,
      pattern.context,
      pattern.severity,
      pattern.occurrenceCount,
      pattern.createdAt,
      pattern.lastOccurredAt,
      pattern.reason,
      JSON.stringify(pattern.tags),
      pattern.active ? 1 : 0,
    ]);

    return Promise.resolve();
  }

  private rowToPattern(row: Record<string, unknown>): FailurePattern {
    return {
      active: (row.active as number) === 1,
      context: row.context as string,
      createdAt: row.created_at as string,
      id: row.id as string,
      lastOccurredAt: row.last_occurred_at as string,
      occurrenceCount: row.occurrence_count as number,
      pattern: row.pattern as string,
      reason: row.reason as string,
      severity: row.severity as FailurePattern['severity'],
      tags: JSON.parse(row.tags_json as string) as string[],
    };
  }
}
