# Cortex Architecture

## Overview

Cortex is a cognitive infrastructure layer for AI systems. It provides persistent identity, meaning-based memory, and failure-first learning as services that sit between application logic and LLM calls.

The system is model-agnostic. It prepares structured context but does not generate prompts or call LLMs directly.

## Core Components

### Identity Core

**Location:** `src/identity/`

**Responsibility:** Maintain a versioned, immutable identity that persists across sessions.

**Data model:**
- Values (prioritized principles)
- Invariants (hard rules)
- Style constraints
- Risk posture

**Guarantees:**
- Identity cannot be modified at runtime
- All changes are versioned with explicit change reasons
- Full audit trail via version snapshots

---

### Distilled Memory

**Location:** `src/memory/distilled/`

**Responsibility:** Store meaning, not conversations. Memories are distilled lessons extracted from experience.

**Memory types:**
- `lesson` — learned insights
- `preference` — user or system preferences
- `warning` — cautions about potential issues

**Behavior:**
- Confidence scores (0–1) indicate reliability
- Reinforcement increases confidence on repeated observation
- Decay reduces stale memories over time
- Similar memories merge rather than duplicate

---

### Failure Memory

**Location:** `src/memory/failure/`

**Responsibility:** Prevent repeated mistakes by storing failures more strongly than successes.

**Severity levels:**
- `hard` — blocks the request entirely
- `soft` — biases against the pattern without blocking

**Behavior:**
- Patterns are matched via similarity interface
- Occurrence count tracks frequency
- Patterns can be deactivated without deletion
- Blocking decisions are explicit and auditable

---

### Engine

**Location:** `src/engine/`

**Responsibility:** Orchestrate identity, memory, and failure modules to prepare structured context.

**Components:**
- `CortexEngine` — context preparation pipeline
- `Cortex` — facade for simplified instantiation

**Output:** Structured `CortexContext` containing identity, memories, and failure status. No prompt formatting.

---

### Storage

**Location:** `src/storage/`

**Responsibility:** Abstract persistence for all modules.

**Implementations:**
- In-memory (default, no persistence)
- SQLite via sql.js (optional, persistent)

**Design:**
- Each module defines its own storage interface
- Implementations are interchangeable
- No ORM, no migration framework

---

## Data Flow

### Context Preparation Pipeline

```
PrepareContextInput
        │
        ▼
┌───────────────────┐
│   Load Identity   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Check Failures   │──── hard block ────▶ PrepareContextBlocked
└─────────┬─────────┘
          │ (no block)
          ▼
┌───────────────────┐
│ Retrieve Memories │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Build Context    │
└─────────┬─────────┘
          │
          ▼
  PrepareContextSuccess
```

The pipeline exits early on hard blocks. Soft blocks are included in the output for consumer-side handling.

---

## Storage Model

### Schema Strategy

- Complex nested objects (values, invariants) stored as JSON columns
- Tags stored as JSON arrays
- Boolean fields stored as integers (0/1)
- Timestamps stored as ISO strings

### Tables

| Module | Tables |
|--------|--------|
| Identity | `identities`, `identity_versions` |
| Distilled Memory | `distilled_memories` |
| Failure Memory | `failure_patterns` |

Indexes exist on frequently filtered columns (type, severity, active).

---

## Non-Goals

Cortex explicitly does not:

- Generate prompts or format LLM input
- Call LLMs or manage API keys
- Implement autonomous learning or reflection loops
- Store raw conversation logs
- Provide a user interface
- Claim consciousness, sentience, or personality

---

## V1 Boundaries

### Included

- Identity with versioning and validation
- Distilled memory with reinforcement and decay
- Failure memory with pattern blocking
- Engine for context preparation
- In-memory and SQLite storage
- Deterministic similarity provider

### Deferred

- Goal arbitration
- Embedding-based similarity providers
- PostgreSQL adapter
- Distributed storage
- REST API
- Self-reflection loops

---

## Module Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                       Consumer                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Cortex Engine                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Identity   │  │   Memory    │  │     Failure     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
          └────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Storage   │
                    └─────────────┘
```

Each module owns its domain. Cross-module communication happens through the engine, not directly between modules.

