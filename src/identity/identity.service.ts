/**
 * Identity Service
 *
 * Provides controlled access to identity operations.
 * Identity is immutable at runtime - updates go through this service
 * and are versioned for audit purposes.
 */

import { v4 as uuidv4 } from 'uuid';

import { validateCreateInput, validateIdentity, validateUpdateInput } from './schema.js';
import {
  CreateIdentityInput,
  Identity,
  IdentityVersion,
  Invariant,
  StyleConstraint,
  UpdateIdentityInput,
  Value,
} from './types.js';

/**
 * Storage interface for identity persistence
 * This allows different storage backends (SQLite, Postgres, etc.)
 */
export interface IdentityStorage {
  /** Save an identity (insert or update) */
  save(identity: Identity): Promise<void>;
  /** Load an identity by ID */
  load(id: string): Promise<Identity | null>;
  /** Save a version snapshot */
  saveVersion(version: IdentityVersion): Promise<void>;
  /** Get all versions for an identity */
  getVersions(identityId: string): Promise<IdentityVersion[]>;
  /** Get a specific version */
  getVersion(identityId: string, version: number): Promise<IdentityVersion | null>;
  /** List all identity IDs */
  listIds(): Promise<string[]>;
  /** Delete an identity and all its versions */
  delete(id: string): Promise<void>;
}

/**
 * In-memory storage implementation for testing and simple use cases
 */
export class InMemoryIdentityStorage implements IdentityStorage {
  private identities: Map<string, Identity> = new Map();
  private versions: Map<string, IdentityVersion[]> = new Map();

  delete(id: string): Promise<void> {
    this.identities.delete(id);
    this.versions.delete(id);
    return Promise.resolve();
  }

  getVersion(identityId: string, version: number): Promise<IdentityVersion | null> {
    const versions = this.versions.get(identityId) ?? [];
    return Promise.resolve(versions.find((v) => v.version === version) ?? null);
  }

  getVersions(identityId: string): Promise<IdentityVersion[]> {
    return Promise.resolve(this.versions.get(identityId) ?? []);
  }

  listIds(): Promise<string[]> {
    return Promise.resolve(Array.from(this.identities.keys()));
  }

  load(id: string): Promise<Identity | null> {
    return Promise.resolve(this.identities.get(id) ?? null);
  }

  save(identity: Identity): Promise<void> {
    this.identities.set(identity.id, identity);
    return Promise.resolve();
  }

  saveVersion(version: IdentityVersion): Promise<void> {
    const versions = this.versions.get(version.identityId) ?? [];
    versions.push(version);
    this.versions.set(version.identityId, versions);
    return Promise.resolve();
  }
}

/**
 * Identity Service - the main interface for identity operations
 */
export class IdentityService {
  constructor(private readonly storage: IdentityStorage) {}

  /**
   * Create a new identity
   */
  async create(input: CreateIdentityInput): Promise<Identity> {
    // Validate input
    const validation = validateCreateInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid identity input: ${validation.errors.join('; ')}`);
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    // Create identity with generated IDs for nested objects
    const identity: Identity = {
      createdAt: now,
      description: input.description,
      id,
      invariants: input.invariants.map((inv) => ({
        ...inv,
        id: uuidv4(),
      })) as Invariant[],
      name: input.name,
      riskPosture: input.riskPosture,
      styleConstraints: input.styleConstraints.map((sc) => ({
        ...sc,
        id: uuidv4(),
      })) as StyleConstraint[],
      updatedAt: now,
      values: input.values.map((v) => ({
        ...v,
        id: uuidv4(),
      })) as Value[],
      version: 1,
    };

    // Validate the complete identity
    const identityValidation = validateIdentity(identity);
    if (!identityValidation.valid) {
      throw new Error(`Identity validation failed: ${identityValidation.errors.join('; ')}`);
    }

    // Save identity
    await this.storage.save(identity);

    // Save initial version
    const version: IdentityVersion = {
      changeReason: 'initial',
      createdAt: now,
      identityId: id,
      snapshot: identity,
      version: 1,
    };
    await this.storage.saveVersion(version);

    return identity;
  }

  /**
   * Delete an identity and all its versions
   */
  async delete(id: string): Promise<void> {
    const existing = await this.storage.load(id);
    if (existing === null) {
      throw new Error(`Identity not found: ${id}`);
    }
    await this.storage.delete(id);
  }

  /**
   * Get a specific version of an identity
   */
  async getVersion(identityId: string, version: number): Promise<IdentityVersion | null> {
    return this.storage.getVersion(identityId, version);
  }

  /**
   * Get version history for an identity
   */
  async getVersionHistory(identityId: string): Promise<IdentityVersion[]> {
    return this.storage.getVersions(identityId);
  }

  /**
   * List all identity IDs
   */
  async list(): Promise<string[]> {
    return this.storage.listIds();
  }

  /**
   * Load an identity by ID
   */
  async load(id: string): Promise<Identity | null> {
    return this.storage.load(id);
  }

  /**
   * Update an identity (creates a new version)
   *
   * This is the ONLY way to modify an identity.
   * Updates are versioned and require a change reason.
   */
  async update(id: string, input: UpdateIdentityInput): Promise<Identity> {
    // Validate input
    const validation = validateUpdateInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid update input: ${validation.errors.join('; ')}`);
    }

    // Load existing identity
    const existing = await this.storage.load(id);
    if (existing === null) {
      throw new Error(`Identity not found: ${id}`);
    }

    const now = new Date().toISOString();

    // Create updated identity
    const updated: Identity = {
      ...existing,
      description: input.description ?? existing.description,
      invariants: input.invariants !== undefined
        ? input.invariants.map((inv) => ({
          ...inv,
          id: uuidv4(),
        })) as Invariant[]
        : existing.invariants,
      riskPosture: input.riskPosture ?? existing.riskPosture,
      styleConstraints: input.styleConstraints !== undefined
        ? input.styleConstraints.map((sc) => ({
          ...sc,
          id: uuidv4(),
        })) as StyleConstraint[]
        : existing.styleConstraints,
      updatedAt: now,
      values: input.values !== undefined
        ? input.values.map((v) => ({
          ...v,
          id: uuidv4(),
        })) as Value[]
        : existing.values,
      version: existing.version + 1,
    };

    // Validate updated identity
    const identityValidation = validateIdentity(updated);
    if (!identityValidation.valid) {
      throw new Error(`Updated identity validation failed: ${identityValidation.errors.join('; ')}`);
    }

    // Save updated identity
    await this.storage.save(updated);

    // Save version snapshot
    const version: IdentityVersion = {
      changeReason: input.changeReason,
      createdAt: now,
      identityId: id,
      snapshot: updated,
      version: updated.version,
    };
    await this.storage.saveVersion(version);

    return updated;
  }
}

