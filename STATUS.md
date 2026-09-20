# Status — 2026-09-20

- Version: 0.2.0; experimental explicit plan/report contracts.
- Implemented: dependency scheduling, complete graph preflight, envelope/candidate transport, identity-bound responses, scoped failure propagation, immutable trace snapshots, and injected kit materialization/verification.
- Local evidence: 21 unit/contract tests plus 6 real integration tests passed, zero skipped, Node 24.19.0/Linux.
- Exact source set: `fixtures/integration-sources.json`; current integrated proof in `evidence/creation-integrated-2026-09-20/`.
- Visual observation: two native-rasterizer 720 × 420 views inspected. The concrete geometry and normal-facing color layout are visible; no broad quality claim.
- CI configuration repeats unit/integration/proof on Linux/Node 20 and Windows/Node 22.

Still open: automatic decomposition, discovery/selection policy, general semantic/visual acceptance, incremental reuse of prior task results, and a full authoring UI. Those are not implemented by this explicit workflow. Hardware remains independent and was not exercised.

A CANDIDATE is not canon or a released creation. Independent machine warnings and holds retain their original scope.
