# Explicit creation plans

## Plan data

The top-level envelope carries `envelope_version: "0.1"`, `request_id`, `goal`, and `tasks`. Set `schema: "axm.morphtile.creation-plan/v0.1"` for named dependencies. `provenance` remains caller-supplied context.

| Task field | Meaning |
| --- | --- |
| `id` | Unique plain identifier, 1–80 ASCII letters, digits, underscores or hyphens |
| `kind` | form, surface, capability, interface, assembly or verification |
| `packet` | Complete machine request, with its own unique request_id, envelope_version and goal |
| `depends_on` | Optional task ids that must succeed first; adds ordering without transporting data |
| `inputs_from` | Assembly only: append complete producer response envelopes after literal packet.inputs, in the stated order |
| `candidate_from` | Verification only: copy the source response's candidate into packet.candidate; cannot overwrite a literal candidate |

The Director validates the entire graph and registry before invoking any machine. Missing machines, malformed references, duplicate identities, cycles and ambiguous writes return HOLD. Scheduling follows dependencies first, then the fixed specialist order, then task id using code-point comparison. Input task declaration order does not change a named graph's execution or output.

Literal inputs are useful for explicit caller choices. In the fixture, the caller declares `ui_panel` eligibility in a literal Assembly input. The Director does not infer that every 3D form is also a UI. Definition and word bodies are explicit Assembly `world_requirements`; the Director does not fetch or fabricate them.

## Registry and results

Each registry entry exposes `{id, version, run(packet)}`. The callback is synchronous, host-supplied code. A named-plan response must identify the exact submitted request and registered machine/version, use the v0.1 envelope, provide arrays for evidence/warnings/dependencies/holds, and use CANDIDATE, PASS, HOLD or FAIL. A successful response cannot carry unresolved holds; CANDIDATE requires an object payload.

The Director isolates packets and snapshots responses. A callback that mutates its packet is held. Exceptions, asynchronous callbacks and malformed results become scoped holds. It cannot undo arbitrary callback side effects: callers should supply deterministic machine APIs, as the official fixtures do.

A failed/held task blocks its descendants, while unrelated tasks can still execute. A valid FAIL outranks HOLD in the parent report. All successful child results leave the parent at CANDIDATE, including a Verification PASS. No execution writes canonical MorphTile state.

The report contains the actual execution order, terminal task ids and one entry per task. Each executed entry retains its resolved packet, response, dependency response hashes, status and execution marker. SHA-256 is calculated over sorted-key JSON; it identifies content and is not authentication. Parent warnings preserve their source task and machine.

Bounds are transport/resource limits: 1–64 tasks, 2 MiB per input plan/resolved packet/response, 200,000 JSON nodes and depth 128 per snapshot, and a 16 MiB report. Finite plain JSON only. A report that cannot fit returns an explicit HOLD with a digest trace instead of a usable candidate. These limits do not limit MorphTile's world depth or set any specialist production quota.

Legacy unlabelled `{kind, packet}` tasks remain accepted under the previous request shape, with status-only child compatibility. They also execute in specialist order. Dependency fields require the new explicit plan schema. Reports use v0.2; consumers should select the declared report version.

## Portable creation

`require('./src/creation').createKit(request, registry, adapters)` is an optional coordinator over public callbacks. Supply the runtime, Assembly's `materializeKit`, Verification's `verifyKitCandidate` as `verifyKit`, and explicit `assembly_task`/`verification_task` ids.

The selected Verification task must have passed while consuming the exact selected Assembly candidate. Assembly then materializes the kit; the independent kit verifier checks it. Failure leaves the public `candidate.kit` null while observations remain inspectable. Success returns CANDIDATE, the kit, complete Director report, kit-build evidence and independent kit receipt.

This verifies the adapters' declared kit checks. It does not prove arbitrary authored expressions, behavior or visuals. The fixture's runtime, geometry, replay and rollback evidence comes from separate executed integration tests and the proof tool. The caller still imports and commits through MorphTile's ordinary contracts.

## Source and observation evidence

The optional `tools/ecosystem.js` host loads only caller-selected, clean, exactly pinned checkouts through their public entry points. It is not part of the Director's dependency-free library path. The original and integrated proof records retain their actual source identities separately.

The integrated proof uses six repeated definition instances, one shared word, normal-facing material, a near-triggered sleeping counter and an ordered tile-owned interface. At radius 4 it wakes with count 7; one signal increments it to 8; sleeping beyond the hysteresis band and waking again retains 8. Canonical matter is unchanged. Live and replay hashes agree. Fresh-world geometry matches, and immediate installation rollback restores the full world hash.

The full-world rollback assertion initially failed on MorphTile b6b086e because an absent `words` registry became `{}`. Core PR #11 added replayable registry-presence metadata; the assertion now passes without changing its expected semantics.

Both 720 × 420 native-rasterizer views were inspected: six distinct blue stations, yellow upward-facing bases, no clipped station in either frame. Sleeping and active pixel hashes agree because the grant changes logic only. No browser layout, general visual quality, performance, autonomous goal decomposition or hardware behavior was tested here.
