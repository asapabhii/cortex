# Cortex

Cognitive infrastructure layer for AI systems. Model-agnostic. Provides persistent identity, meaning-based memory, and failure prevention as services.

## Responsibilities

- **Identity**: Versioned configuration. Immutable at runtime.
- **Memory**: Stores distilled lessons. Confidence-weighted. Decays over time.
- **Failure**: Records patterns. Blocks known failures before LLM calls.

## Boundaries

Cortex prepares structured context. It does not call LLMs, generate prompts, or store conversations.

## Architecture

```
Engine
  ├── Identity
  ├── Memory (distilled)
  └── Failure
        │
     Storage
```

See [docs/architecture.md](./docs/architecture.md).

## Usage

```typescript
import { Cortex } from 'cortex';

const cortex = Cortex.create();
const result = await cortex.prepareContext({
  identityId: 'agent-001',
  query: 'input',
});
```

## V1 Scope

Included: identity, distilled memory, failure memory, engine, in-memory and SQLite storage.

Not included: goal arbitration, reflection loops, embedding providers, REST API.

## License

Apache 2.0
