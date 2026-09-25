# MorphTile Creation Director

An explicit creation plan connects independent MorphTile machines into a reproducible pipeline. Named tasks run in dependency order; Assembly receives complete producer envelopes, and Verification receives the assembled candidate. Every executed packet and response remains inspectable with its content hash.

`src/` has zero runtime dependencies outside Node, no I/O and no sibling imports. The host supplies the registry and optional kit adapters. MorphTile core never depends on this repository.

## Use

```js
const { run } = require('./src');
const { createKit } = require('./src/creation');

// Host-supplied public machine entry points; nothing is discovered or installed.
const registry = {
  form: { ...Form.MACHINE, run: Form.run },
  surface: { ...Surface.MACHINE, run: Surface.run },
  capability: { ...Capability.MACHINE, run: Capability.run },
  interface: { ...Interface.MACHINE, run: Interface.run },
  assembly: { ...Assembly.MACHINE, run: Assembly.run },
  verification: { ...Verification.MACHINE, run: Verification.run }
};
const report = run(plan, registry);
const creation = createKit(plan, registry, {
  assembly_task: 'assemble', verification_task: 'verify',
  runtime: MorphTile,
  materializeKit: AssemblyKit.materializeKit,
  verifyKit: VerificationKit.verifyKitCandidate
});
// creation.status remains CANDIDATE. A successful portable artifact is
// creation.candidate.kit; normal MorphTile import/clone/plan/commit rules apply.
```

See [the complete plan](fixtures/request.creation.json) and [the plan contract](docs/EXPLICIT_PLANS.md).

## Reproduce

```sh
npm test
MORPHTILE_ECOSYSTEM_ROOT=/path/to/pinned-checkouts npm run test:integration
MORPHTILE_ECOSYSTEM_ROOT=/path/to/pinned-checkouts npm run prove -- /empty/output/folder
```

The optional test/proof host requires explicit clean checkouts in `core/`, `form/`, `surface/`, `capability/`, `interface/`, `assembly/` and `verification/`. It checks actual Git identities against [integration-sources.json](fixtures/integration-sources.json). It never downloads packages or discovers sibling directories. The CI workflow shows the exact checkout layout. `prove` writes only to the explicitly supplied empty folder; without a folder it prints the proof.

## What was exercised

Twenty-one routing/contract tests and six integration tests cover real six-machine composition, exact repeat output, closure/provenance, dependency failures, wrong response identities, input mutation, kit hash verification, semantic tampering, runtime geometry, named UI actions, near wake/sleep, replay, fresh-world portability and immediate rollback.

The proof tile retains one reusable definition and one word, builds six stations with 1,236 triangles, and has a counter that survives sleep. Both rendered angles were inspected at 720 × 420 in the native rasterizer. This demonstrates the fixture, not general aesthetic quality.

[Current proof](evidence/creation-integrated-2026-09-20/proof.json) · [Portable kit](evidence/creation-integrated-2026-09-20/pavilion-kit.json) · [Full creation trace](evidence/creation-integrated-2026-09-20/creation.json)

![Six stations produced by the explicit machine plan](evidence/creation-integrated-2026-09-20/pavilion.png)

## Boundary

Plan/report formats remain experimental. Goals describe explicit work; there is no natural-language decomposition model, automatic discovery, autonomous research, network execution, release or CANON authority. General machine determinism depends on the supplied synchronous callbacks. Their structural and visual warnings remain visible. A structural PASS is never upgraded to runtime or visual evidence by the Director.

The original foundation brief and handoff remain historical records. Current contracts and evidence are described here and in [STATUS.md](STATUS.md). Licence: PolyForm Noncommercial 1.0.0; see [LICENSE](LICENSE).

## Reusable simulation method

[Simulation experience and reuse](docs/SIMULATION_EXPERIENCE_REUSE.md) connects the shared method to this repository, with existing machinery, proposed experiments and explicit evidence limits.
