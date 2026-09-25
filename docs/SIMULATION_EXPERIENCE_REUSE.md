# Compare creation plans in small repeatable worlds

Status: proposed applications of an existing method; documentation only.
Inspected source: `13c79d18d1662629c0bd11b7f2546eb991f97912`.

[Shared method and measured neural example](https://github.com/mike-axiom-mir/axm-state-research/blob/main/docs/SIMULATION_AS_REUSABLE_EXPERIENCE.md).

[Explicit plans](EXPLICIT_PLANS.md), the
[creation fixture](../fixtures/request.creation.json), and the
[pinned integration sources](../fixtures/integration-sources.json) already give
a bounded place to compare assembly candidates.

## First useful comparison

Start from the existing six-machine fixture. Vary declared plan parameters and
world requirements, keeping the same pinned machine registry. Compare the
baseline with a bounded family of candidate plans; retain complete producer
envelopes, resolved inputs, dependency hashes, holds and actual cost.

Run promising kits in fresh disposable worlds through the existing public
materialize/verify adapters. Test replay, retained state across sleep/wake,
fresh-world portability and rollback. A later search scheduler could choose the
next candidate, but it must use the same explicit plans and result semantics.

## Retained value and limits

Keep the construction plan, portable kit and exact machine versions. Do not
retain only a screenshot. Structural checks, runtime tests and rendered views
answer different questions; inspect real output before claiming visual quality.

The Director remains a dependency-free synchronous coordinator. Host-supplied
callbacks can have effects it cannot undo, so a simulation harness must choose
its providers and disposable state deliberately. Even successful verification
leaves a kit at CANDIDATE; ordinary MorphTile adoption rules still apply.
This note adds no automatic discovery, neural dependency or canonical write.
