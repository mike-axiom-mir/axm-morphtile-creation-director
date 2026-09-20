"use strict";

const path = require("node:path");
const { execFileSync } = require("node:child_process");
const pins = require("../fixtures/integration-sources.json");

// Explicit host/test loader. Source checkout is a separate caller action; this
// tool never downloads or installs anything, and src/ has no filesystem access.
function loadEcosystem(root) {
  if (!root) throw new Error("Supply MORPHTILE_ECOSYSTEM_ROOT with pinned checkouts in core/, form/, surface/, capability/, interface/, assembly/, verification/.");
  const modules = {}, locations = {}, sources = {};
  for (const [kind, pin] of Object.entries(pins)) {
    const location = path.resolve(root, kind);
    const git = args => execFileSync("git", ["-C", location, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const commit = git(["rev-parse", "HEAD"]);
    if (commit !== pin.commit) throw new Error(kind + " checkout does not match integration-sources.json: " + commit);
    if (git(["status", "--porcelain", "--untracked-files=normal"])) throw new Error(kind + " checkout must be clean");
    modules[kind] = require(path.join(location, pin.entry));
    locations[kind] = location;
    sources[kind] = { repository: pin.repository, commit, tree: git(["rev-parse", "HEAD^{tree}"]) };
  }
  const registry = Object.fromEntries(Object.entries(modules).filter(([kind]) => kind !== "core").map(([kind, module]) => [kind, { ...module.MACHINE, run: module.run }]));
  const { materializeKit } = require(path.join(locations.assembly, "src/kit.js"));
  const { verifyKitCandidate } = require(path.join(locations.verification, "src/kit-conformance.js"));
  return { modules, registry, sources, locations, runtime: modules.core, adapters: { assembly_task: "assemble", verification_task: "verify", materializeKit, verifyKit: verifyKitCandidate, runtime: modules.core } };
}

module.exports = { loadEcosystem };
