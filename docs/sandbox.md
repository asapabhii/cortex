# Cortex Sandbox

## Purpose

The Cortex Sandbox is a developer tool for observing, validating, and replaying Cortex behavior. It consumes Cortex as a dependency and provides inspection capabilities without modifying core functionality.

Intended users: developers integrating Cortex into AI systems who need to validate behavior, debug state, and ensure deterministic operation.

## Responsibilities

### Observable

- Identity state (current snapshot, version history)
- Distilled memory state (all memories, metadata, decay status)
- Failure memory state (patterns, severity, active status)
- Engine decisions (block/allow, matched patterns, retrieved memories)

### Simulable

- Context preparation with controlled inputs
- Memory recording and reinforcement
- Failure pattern matching
- Decay and cleanup cycles

### Not Responsible For

- LLM calls or prompt generation
- Autonomous behavior or agents
- Network services or APIs
- Modifying Cortex core behavior

## Interaction Model

### Input Specification

Inputs are defined as structured objects containing:
- Identity ID to load
- Query text
- Optional context
- Optional memory/failure operation overrides

### Invocation Flow

```
Input Spec
    |
    v
Sandbox Runner
    |
    v
Cortex Instance (isolated)
    |
    v
Captured Output + State Snapshot
```

### Output Capture

Each invocation produces:
- Full `PrepareContextResult` from the engine
- State snapshot of identity, memory, and failure modules
- Decision metadata (what was blocked, what was retrieved)

### Session Management

Sandbox maintains isolated Cortex instances per session. State does not persist between sessions unless explicitly exported.

## Inspectable State

### Identity

| Inspection | Description |
|------------|-------------|
| Current | Full identity object with values, invariants, constraints |
| Versions | List of all versions with change reasons |
| Diff | Comparison between any two versions |

### Distilled Memory

| Inspection | Description |
|------------|-------------|
| List | All memories with type, content, confidence |
| Metadata | Reinforcement count, decay factor, timestamps |
| Filter | By type, confidence threshold, tags |

### Failure Memory

| Inspection | Description |
|------------|-------------|
| List | All patterns with severity and status |
| Metadata | Occurrence count, created/last occurred timestamps |
| Filter | By severity, active status, tags |

### Engine Decisions

| Inspection | Description |
|------------|-------------|
| Block status | Whether request was blocked |
| Matched patterns | Which failure patterns matched |
| Retrieved memories | Which memories were returned |
| Identity context | Structured identity data used |

## Replay and Determinism

### Run Recording

A run is recorded as:
- Input specification
- Timestamp
- Cortex configuration at time of run
- Full state snapshot before execution
- Full state snapshot after execution
- Output produced

### Replay Execution

Replay restores the pre-execution state snapshot, applies the same input, and compares output against the recorded result.

### Determinism Guarantees

Given identical:
- Input specification
- Initial state
- Cortex configuration
- Similarity provider

Output will be identical. Cortex contains no randomness in its decision paths.

### Limitations

- Similarity providers with non-deterministic behavior break replay guarantees
- Timestamps in recorded state will differ on replay (content remains identical)

## Example Scenarios

### Memory Reinforcement Over Time

A sequence of inputs containing similar content. Sandbox observes:
- Initial memory creation with base confidence
- Subsequent inputs triggering reinforcement
- Confidence increasing with each reinforcement
- Decay application between runs
- Memory merging when similarity threshold exceeded

### Failure Pattern Blocking

An input matching a recorded failure pattern. Sandbox observes:
- Pattern match via similarity check
- Severity evaluation (hard vs soft)
- Early exit on hard block
- Block reason and matched pattern in output
- Soft patterns included in context without blocking

### Identity Version Change Impact

Identity updated between runs. Sandbox observes:
- Version increment and change reason recorded
- New values/invariants reflected in context
- Previous version accessible via history
- Diff showing what changed

## Boundaries

The sandbox explicitly does not:

- Modify Cortex core modules
- Execute LLM calls
- Generate prompts or format output for models
- Implement autonomous loops or agents
- Persist state beyond explicit export
- Provide network-accessible services
- Include UI components

## Integration

The sandbox imports Cortex modules directly:

| Module | Path | Usage |
|--------|------|-------|
| Cortex facade | `src/engine/cortex.ts` | Primary entry point |
| Identity types | `src/identity/types.ts` | State inspection |
| Memory types | `src/memory/distilled/types.ts` | State inspection |
| Failure types | `src/memory/failure/types.ts` | State inspection |
| Storage | `src/storage/` | State export/import |

Cortex core remains unmodified. Sandbox operates as a consumer.

