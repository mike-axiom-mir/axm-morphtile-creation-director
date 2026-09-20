# Architecture

`src/plan.js` validates explicit graph structure and computes a stable dependency order. `src/index.js` invokes injected public machine callbacks and retains their complete packets/responses. `src/data.js` bounds and hashes JSON transport. `src/creation.js` optionally coordinates injected Assembly kit materialization and independent kit verification.

The library does not import sibling implementations, use a shared mutable store, perform I/O, discover installed machines or depend on a cloud service. Creation knowledge stays in the specialist; representation/runtime semantics stay in MorphTile core. A report and kit are candidate data only.

The optional test/proof host in `tools/ecosystem.js` is explicit: the caller supplies a checkout root, the host verifies each pinned Git identity and cleanliness, and it injects those public entry points. Source acquisition is separate. No sibling is modified.

See `docs/EXPLICIT_PLANS.md` for ordering, failure, trace and resource semantics. The original foundation documents remain historical provenance.
