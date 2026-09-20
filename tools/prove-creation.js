"use strict";

const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { loadEcosystem } = require("./ecosystem");
const { createKit } = require("../src/creation");
const fixture = require("../fixtures/request.creation.json");
const E = loadEcosystem(process.env.MORPHTILE_ECOSYSTEM_ROOT), M = E.runtime;
const first = createKit(fixture, E.registry, E.adapters);
assert.equal(first.status, "CANDIDATE", JSON.stringify(first.holds));
assert.deepEqual(createKit(fixture, E.registry, E.adapters), first);
const kit = first.candidate.kit;
const ws = M.createWorkspace(M.createWorld("Director receiver")), before = M.hashOf(ws.live);
const incoming = M.importKit(ws.live, M.clone(kit)); assert.equal(incoming.status, "READY");
const c = M.cloneBody(ws);
for (const op of incoming.ops) assert.equal(M.editCandidate(ws, c, op).ok, true);
assert.equal(M.hashOf(ws.live), before);
const committed = M.commitPlan(ws, M.planMerge(ws, [c]).id); assert.equal(committed.ok, true);
const installed = M.hashOf(ws.live), matter = M.structHash(ws.live);
const camera = { yaw: 0.65, pitch: 0.3, dist: 14, target: [4.5, 1.5, 0] };
const sleepingFrame = M.renderAsset(ws.live, { width: 720, height: 420, camera });
assert.equal(M.isAwake(ws.live, "mt_pavilion", "counter"), false);
M.act(ws, { do: "settle", from: [4, 0, 0] });
assert.equal(M.readVars(ws.live, "mt_pavilion", 0).count, 7);
M.act(ws, { do: "signal", tile: "mt_pavilion", name: "increment" });
assert.equal(M.readVars(ws.live, "mt_pavilion", 0).count, 8);
M.act(ws, { do: "settle", from: [7, 0, 0] });
assert.equal(M.isAwake(ws.live, "mt_pavilion", "counter"), false);
M.act(ws, { do: "settle", from: [0, 0, 0] });
assert.equal(M.readVars(ws.live, "mt_pavilion", 0).count, 8);
assert.equal(M.structHash(ws.live), matter);
const replay = M.act(ws, { do: "reconstruct", fromGenesis: true }); assert.equal(replay.matches_live, true);
const activeFrame = M.renderAsset(ws.live, { width: 720, height: 420, camera });
assert.equal(M.renderReceipt(activeFrame).sha256, M.renderReceipt(sleepingFrame).sha256, "waking a logic-only grant does not change geometry");
const reverseFrame = M.renderAsset(ws.live, { width: 720, height: 420, camera: { ...camera, yaw: -0.65 } });
const rollbackWs = M.createWorkspace(M.createWorld("Director receiver")), rc = M.cloneBody(rollbackWs);
for (const op of incoming.ops) assert.equal(M.editCandidate(rollbackWs, rc, op).ok, true);
const receipt = M.commitPlan(rollbackWs, M.planMerge(rollbackWs, [rc]).id).receipt;
assert.equal(M.rollback(rollbackWs, receipt.rollback_token).exact, true);
assert.equal(M.hashOf(rollbackWs.live), before);
assert.equal(M.act(rollbackWs, { do: "reconstruct", fromGenesis: true }).matches_live, true);
const geometry = M.compileMesh(ws.live.tiles.mt_pavilion, ws.live);
const proof = {
  schema: "axm.morphtile.creation-proof/v0.1", sources: E.sources,
  request_sha256: M.hashOf(fixture), kit_sha256: kit.expect.sha256,
  pipeline_status: first.status, repeated_pipeline_identical: true,
  machine_order: first.candidate.report.candidate.order,
  kit_verification: first.candidate.kit_verification,
  geometry: { hold: geometry.hold, triangles: geometry.T.length, definition_count: kit.expect.defs, word_count: kit.expect.words },
  counter: { initial: 7, after_signal: 8, after_sleep_and_rewake: 8 },
  canonical_matter_unchanged_by_behavior: M.structHash(ws.live) === matter,
  installed_world_sha256: installed, live_sha256: M.hashOf(ws.live), replay_sha256: replay.hash,
  immediate_rollback: { before_sha256: before, after_sha256: M.hashOf(rollbackWs.live) },
  renders: { sleeping: M.renderReceipt(sleepingFrame), active: M.renderReceipt(activeFrame), reverse: M.renderReceipt(reverseFrame) },
  scope: "Native rasterizer and declared fixture behavior only. No general visual-quality, performance, autonomous decomposition or production-readiness claim."
};
const destination = process.argv[2];
if (destination) {
  const out = path.resolve(destination);
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error("Evidence destination must be empty; existing evidence is not overwritten.");
  fs.mkdirSync(out, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(out, name), data, { flag: "wx" });
  write("proof.json", JSON.stringify(proof, null, 2) + "\n");
  write("creation.json", JSON.stringify(first, null, 2) + "\n");
  write("pavilion-kit.json", JSON.stringify(kit, null, 2) + "\n");
  const png = require(path.join(E.locations.core, "tools/png.js"));
  write("pavilion.png", png.encode(activeFrame.width, activeFrame.height, activeFrame.pixels));
  write("pavilion-reverse.png", png.encode(reverseFrame.width, reverseFrame.height, reverseFrame.pixels));
}
process.stdout.write(JSON.stringify(proof, null, 2) + "\n");
