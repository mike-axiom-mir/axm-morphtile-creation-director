# Changelog

## 0.1.1 — 2026-09-20

- Failed closed on task kinds outside the six-machine MorphTile team even when an arbitrary registry entry is present.
- Prevented malformed task entries from reaching registry code.
- Added regression coverage proving unsupported registry entries are never invoked.
- Preserved the existing deterministic route order and truthful child FAIL/HOLD propagation.

## 0.1.0 — 2026-09-19

- Established the isolated repository boundary.
- Added provisional envelope v0.1, machine manifest, fixture, executable proof, tests, and minimal CI.
- Pinned the exact MorphTile v0.4 commit tested as a contract target.
- Recorded unsupported work as HOLD or NOT TESTED.
