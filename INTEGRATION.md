# MorphTile integration

The current exact tested runtime and six machines are listed in `fixtures/integration-sources.json`. The proof host verifies actual clean checkout identities before running; declared pins alone are not treated as executed evidence.

MorphTile remains independent of the Director and all official machines. The Director consumes public request/result envelopes. The optional creation path injects Assembly's `materializeKit` and Verification's `verifyKitCandidate` against the supplied MorphTile runtime.

A returned kit is data. The receiving caller uses `importKit`, clone/edit, plan, commit, receipt and rollback. The integration suite performs those steps only in disposable worlds, then checks named actions, retained sleep state, replay and exact immediate rollback. It does not modify a caller's live world.

The CI workflow and `npm run prove` reproduce the explicit signal-pavilion fixture. The original proof and the integrated-source proof are kept separately; advancing compatibility requires executing against the new identities.
