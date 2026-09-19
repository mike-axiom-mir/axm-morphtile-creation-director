# MorphTile Creation Director

Deterministically routes explicit goal tasks through an explicit compatible-machine registry and returns an inspectable report.

## Boundary answers

1. **What it does:** Deterministically routes explicit goal tasks through an explicit compatible-machine registry and returns an inspectable report.
2. **What it does not own:** Artifact generation internals, automatic canon, verification bypass, private chat memory, or fabricated capabilities.
3. **What it accepts:** axm.morphtile.goal-request/v0.1 with explicit tasks and packets.
4. **What it produces:** An axm.morphtile.director-report/v0.1 candidate.
5. **MorphTile interaction:** output goes through MorphTile's public contracts and clone → plan → commit → receipt → rollback path. MorphTile does not depend on this repository.
6. **Evidence:** Deterministic routing and missing-machine HOLD tests.
7. **When it cannot satisfy a request:** A missing requested machine returns HOLD_MACHINE_MISSING.

## Run

    npm test

Node 18 or later; zero runtime dependencies; no secrets or network required.

The original ecosystem foundation instruction is preserved verbatim in `docs/FOUNDATION_BRIEF.txt`; this repository does not turn its future goals into implementation claims.

## Truth boundary

- IMPLEMENTED: the tiny adapter and local envelope used by the fixtures.
- TESTED: the claims named by the local test files.
- EXPERIMENTAL: envelope v0.1 and every candidate schema in this foundation.
- NOT TESTED: compatibility beyond MorphTile commit 13d83a2b2c0d12644442d3d9e45bcbe0af19876a.
- HELD: No real sibling invocation, decomposition model, assembly, or verification execution yet.

This is a foundation, not evidence that MorphTile can autonomously manufacture MorphTile.
