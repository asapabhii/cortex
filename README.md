# Cortex

**Cognitive Infrastructure Layer for AI Systems**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

## What This Is

Cortex is a **model-agnostic infrastructure layer** that provides:

1. **Persistent Identity** — A versioned, immutable identity core that remains stable across sessions and cannot be overwritten by runtime prompts.

2. **Meaning-Based Memory** — Long-term memory that stores distilled lessons, not raw conversations. Memories have confidence scores, decay over time, and merge when similar.

3. **Failure Memory** — A negative capability system that prevents repeated mistakes by storing failures more strongly than successes and blocking known bad patterns before they reach the LLM.

---

## What This Is NOT

- ❌ **Not an AI model** — Cortex works *with* any LLM, not as a replacement
- ❌ **Not a chatbot** — No conversation UI, no chat interface
- ❌ **Not about consciousness** — No claims of sentience, emotions, or human-like qualities
- ❌ **Not a fine-tuning system** — No model training or weight modification
- ❌ **Not a personality layer** — Identity is about values and constraints, not character traits

---

## Why This Exists

Current AI systems have three fundamental limitations:

1. **No persistent identity** — Each session starts fresh, identity is defined entirely by prompts that can be manipulated or overwritten.

2. **No semantic memory** — Systems either remember nothing or store raw conversation logs. Neither approach captures *meaning*.

3. **No failure learning** — Systems repeat the same mistakes because they have no mechanism to learn from failures across sessions.

Cortex solves these problems at the infrastructure level, making any LLM-based system more reliable, consistent, and capable of genuine improvement over time.

---

## Core Principles

| Principle | Implementation |
|-----------|----------------|
| Memory stores **meaning**, not conversations | Distillation layer extracts lessons from interactions |
| Identity is **immutable at runtime** | Versioned schema, controlled update API only |
| Failures are **more important** than successes | Asymmetric storage with hard blocking capabilities |
| Everything is **auditable** | Full provenance tracking on all memory operations |
| **No vendor lock-in** | SQLite default, abstract interfaces for all storage |
| **Boring, reliable engineering** | No clever tricks, no magic, just solid infrastructure |

---

## Installation

```bash
npm install cortex
```

Requires Node.js 18+.

---

## Quick Start

```typescript
import { Cortex } from 'cortex';

// Initialize with default SQLite storage
const cortex = new Cortex();

// Load or create an identity
const identity = await cortex.identity.load('agent-001');

// Before any LLM call, get context injection
const context = await cortex.prepareContext({
  identity,
  query: 'user input here',
});

// context.identityPrompt — inject into system prompt
// context.relevantMemories — inject as context
// context.blockedPatterns — patterns to avoid

// After LLM response, record outcomes
await cortex.memory.record({
  type: 'lesson',
  content: 'Extracted insight from this interaction',
  confidence: 0.8,
});

// Record failures for future prevention
await cortex.failure.record({
  pattern: 'specific error pattern',
  context: 'when this happened',
  severity: 'hard', // 'hard' = block, 'soft' = bias against
});
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Cortex Engine                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Identity   │  │   Memory    │  │   Failure Memory    │  │
│  │    Core     │  │  (Distilled)│  │  (Negative Cap.)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                   ┌──────▼──────┐                           │
│                   │   Storage   │                           │
│                   │  Interface  │                           │
│                   └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
        │  SQLite   │ │ Postgres│ │  Custom   │
        │ (default) │ │  (opt)  │ │ (extend)  │
        └───────────┘ └─────────┘ └───────────┘
```

---

## Project Structure

```
/src
  /identity      # Immutable identity core
  /memory
    /distilled   # Meaning-based long-term memory
    /failure     # Failure patterns and blocking
  /storage       # Storage adapters (SQLite, etc.)
  /interfaces    # Abstract interfaces for extensibility
  /engine        # Central orchestration
  /utils         # Shared utilities
/tests           # Test suites
/docs            # Architecture documentation
```

---

## V1 Scope

This is V1. It includes:

- ✅ Identity Core (versioned, immutable)
- ✅ Distilled Memory (lessons, preferences, warnings)
- ✅ Failure Memory (pattern blocking, context blocking)
- ✅ SQLite storage (local, free)
- ✅ Engine for context preparation

It does NOT include:

- ❌ Goal arbitration
- ❌ Self-reflection loops
- ❌ UI of any kind
- ❌ Model training/fine-tuning

---

## License

Apache 2.0 — See [LICENSE](./LICENSE)

---

## Contributing

This project follows strict commit discipline. See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.
