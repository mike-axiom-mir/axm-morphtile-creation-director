# MorphTile machine ecosystem handoff

Date: 2026-09-19

This is the bounded foundation pass. It does **not** establish that MorphTile can manufacture MorphTile.

| Component | Foundation commit | Implemented foundation | Tests / evidence | Exact next specialist task | HOLD / risk | Visual proof |
| --- | --- | --- | --- | --- | --- | --- |
| MorphTile core | `4e2bf00413b63f4b3ec9365328a45e5c27169ac2` | v0.4 remains canonical; four new direction notes are stored verbatim with an honest disposition index | conformance 7 cases; build; 101/101 tests | Formalize universal anchor/reposition semantics before adding new spatial authority | placement descriptor, spatial-anchor contract, and cold-memory experiment remain open | Existing v0.4 evidence only; none for the new notes |
| Form Machine | `79281f9a6117044212d8521599dd4b326887ff85` | box and caller-supplied recipe → candidate tile spec | 2/2 local tests; pinned runtime cross-check accepts assembled output | Run recipe budgets and one composed form through pinned MorphTile | arbitrary geometry and visual acceptance not solved | No |
| Surface Machine | `bd2d73e4ccfa2fb9a08affa30b9a3f17e2393101` | surface-direction procedural-paint candidate plus dependency HOLD | 2/2 local tests; assembled material compiles without HOLD | Capture normal/up-facing render and separate technical from visual review | external bridges and visual quality untested | No |
| Capability Machine | `bb773b557f92c3681af3f5cfc51c7e34dda01521` | deterministic counter plus sleeping grant | 2/2 local tests; pinned runtime wakes on signal and reaches count 1 | Add replay receipt and sleep/wake/forget adversarial fixtures | only counter vocabulary proven | No |
| Interface Machine | `25b9d3080c9dc96320565f90ed9508fdb33fde41` | canonical-name-bound `view.set` candidate | 2/2 local tests; pinned runtime commits view and same action changes same counter | Prove two concurrent presentations over one value; consume only a core-owned placement contract | target must already exist and declare `ui_panel`; presentation placement is `HOLD_PRESENTATION_PLACEMENT_NOT_IN_V04` | No |
| Assembly Machine | `ae09a445b06aa8c83da7dbdc40f27bdd80bb2128` | deterministic facet union; conflict and empty-input HOLDs | 2/2 local tests; cross-repo assembly validates as a MorphTile tile | Preserve per-fragment provenance and emit a portable kit candidate | no runtime validation or kit hashing inside the repo | No |
| Verification Machine | `d14bb2a9511665d7c633871809dd96f95459f280` | PASS/HOLD/FAIL structural verifier and digest receipt | 3/3 local tests, including broken and missing candidates | Add pinned runtime adapter and adversarial portability/replay vectors | current PASS is structural, never aesthetic or production proof | No |
| Creation Director | `70b70d3011493145c246efa54647c8aeb63a7cc9` | explicit registry routing and missing-machine HOLD | 2/2 local tests | Route real fixture packets through Assembly then Verification without importing sibling internals | no decomposition model or real sibling execution yet | No |

All seven manifests declare MorphTile v0.4 commit `13d83a2b2c0d12644442d3d9e45bcbe0af19876a`, provisional envelope v0.1, and fixture version v0.1. Each repository has its own copy of the provisional envelope; no eighth shared protocol repository was created.

The Director commit above is the foundation implementation commit. This handoff itself is added by a follow-up commit, whose immutable identity is the commit containing this file.

## Cross-repository status

- **MORPHTILE CORE:** TESTED v0.4; direction sources recorded; no new runtime feature claimed.
- **FORM MACHINE:** TESTED FOUNDATION; candidate-only.
- **SURFACE MACHINE:** TESTED FOUNDATION; structural evidence only.
- **CAPABILITY MACHINE:** TESTED FOUNDATION; one runtime-woken counter proof.
- **INTERFACE MACHINE:** TESTED FOUNDATION; no duplicate canonical state; placement held.
- **ASSEMBLY MACHINE:** TESTED FOUNDATION; deterministic union and conflict HOLD.
- **VERIFICATION MACHINE:** TESTED FOUNDATION; structural PASS/HOLD/FAIL only.
- **CREATION DIRECTOR:** TESTED FOUNDATION; fixture routing only.

## Licence boundary

Each machine uses PolyForm Noncommercial 1.0.0 plus the Creation-Machine Output Permission: commercial Creator Output is allowed; commercial exploitation or redistribution of the machine itself requires separate written permission after a grounded case. Candidate status never changes who owns an output or makes it canonical.
