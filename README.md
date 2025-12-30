# Cortex

Cognitive infrastructure layer for AI systems.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## What It Does

Cortex sits between your application and the LLM. It provides three capabilities:

**Identity** — A versioned, immutable configuration that defines values, invariants, and constraints. Cannot be modified by runtime prompts. All changes are audited.

**Memory** — Stores distilled meaning, not conversation logs. Memories carry confidence scores, reinforce on repetition, and decay when stale. Similar memories merge.

**Failure Prevention** — Records failure patterns with severity levels. Hard failures block requests before they reach the LLM. Soft failures bias against known bad patterns.

## What It Does Not Do

- Does not generate prompts or call LLMs
- Does not store raw conversations
- Does not implement autonomous learning
- Does not provide a user interface
- Does not claim consciousness or personality

Cortex prepares structured context. The consumer decides how to use it.

## Design Principles

**Memory stores meaning.** Raw logs are not memory. Lessons are.

**Identity is immutable at runtime.** Changes require explicit API calls with documented reasons.

**Failures matter more than successes.** Asymmetric storage. Hard blocks are deterministic.

**Everything is auditable.** Version history on identity. Provenance on memories.

**No vendor lock-in.** Abstract storage interfaces. SQLite ships by default.

## Architecture

```
Consumer
    |
    v
+---------------------------+
|     Cortex Engine         |
|  +--------+ +----------+  |
|  |Identity| | Memory   |  |
|  +--------+ +----------+  |
|  +---------------------+  |
|  |   Failure Memory    |  |
|  +---------------------+  |
+------------+--------------+
             |
      +------v------+
      |   Storage   |
      +-------------+
```

The engine orchestrates identity loading, failure checking, and memory retrieval. Returns structured data. Does not format prompts.

See [docs/architecture.md](./docs/architecture.md) for details.

## Installation

```bash
npm install cortex
```

Requires Node.js 18+.

## Usage

```typescript
import { Cortex } from 'cortex';

// In-memory storage (default)
const cortex = Cortex.create();

// SQLite persistent storage
const cortex = await Cortex.createWithSQLite();

// Prepare context before LLM call
const result = await cortex.prepareContext({
  identityId: 'agent-001',
  query: 'user input',
});

if (!result.success) {
  // Request blocked or error
}

// result.context contains:
// - identityContext
// - memoryContext
// - failureContext
```

## Project Structure

```
src/
  identity/     Identity core
  memory/
    distilled/  Meaning-based memory
    failure/    Failure patterns
  engine/       Orchestration
  storage/      Storage adapters
  interfaces/   Abstractions
```

## V1 Scope

Included:
- Identity with versioning
- Distilled memory with decay
- Failure memory with blocking
- Context preparation engine
- In-memory and SQLite storage

Not included:
- Goal arbitration
- Reflection loops
- Embedding providers
- REST API
- PostgreSQL adapter

## License

Apache 2.0
