const test = require("node:test"), assert = require("node:assert/strict");
const { loadEcosystem } = require("../tools/ecosystem");
const { createKit } = require("../src/creation");
const { run } = require("../src");
const fixture = require("../fixtures/request.creation.json");
const env = loadEcosystem(process.env.MORPHTILE_ECOSYSTEM_ROOT), MT = env.runtime;
const copy = x => JSON.parse(JSON.stringify(x));

function produce(request = fixture) {
  const out = createKit(request, env.registry, env.adapters);
  assert.equal(out.status, "CANDIDATE", JSON.stringify(out.holds));
  return out.candidate;
}
function install(kit) {
  const ws = MT.createWorkspace(MT.createWorld("Director receiver")), before = MT.hashOf(ws.live);
  const imported = MT.importKit(ws.live, copy(kit)); assert.equal(imported.status, "READY");
  assert.equal(MT.hashOf(ws.live), before, "import analysis is a read");
  const id = MT.cloneBody(ws, "Director creation proof", "test");
  for (const op of imported.ops) assert.equal(MT.editCandidate(ws, id, op).ok, true);
  assert.equal(MT.hashOf(ws.live), before, "staging is not a commit");
  const plan = MT.planMerge(ws, [id]); assert.equal(plan.status, "READY");
  const committed = MT.commitPlan(ws, plan.id); assert.equal(committed.ok, true);
  return { ws, before, receipt: committed.receipt };
}

test("six pinned real machines produce the same complete verified kit twice and preserve every source packet", () => {
  const before = copy(fixture), first = produce(), second = produce();
  assert.deepEqual(first, second);
  assert.deepEqual(fixture, before);
  assert.deepEqual(first.report.candidate.order, ["shape", "surface", "capability", "interface", "assemble", "verify"]);
  assert.equal(first.kit.expect.defs, 1); assert.equal(first.kit.expect.words, 1);
  assert.deepEqual(first.kit.expect.missing, []);
  assert.equal(first.kit_verification.status, "PASS");
  assert.equal(first.kit_verification.receipt.tamper_status, "HOLD_HASH_MISMATCH");
  const assembly = first.report.candidate.route.find(s => s.id === "assemble").response;
  assert.deepEqual(assembly.source_provenance.slice(1).map(x => x.machine.id), ["form", "surface", "capability", "interface"].map(k => env.registry[k].id));
  const structural = first.report.candidate.route.find(s => s.id === "verify").response;
  assert.equal(structural.evidence[1].morph_tile_runtime_executed, false, "a structural PASS is not runtime evidence");
});

test("the manufactured tile compiles reusable geometry, wakes, acts through its ordered view and replays exactly", () => {
  const { kit } = produce(), { ws } = install(kit), matter = MT.structHash(ws.live);
  const tile = ws.live.tiles.mt_pavilion, mesh = MT.compileMesh(tile, ws.live);
  assert.equal(mesh.hold, null); assert.ok(mesh.T.length > 100);
  assert.equal(MT.isAwake(ws.live, tile.id, "counter"), false);
  assert.deepEqual(MT.act(ws, { do: "settle", from: [5, 0, 0] }).changes, []);
  assert.equal(MT.act(ws, { do: "settle", from: [4, 0, 0] }).changes.length, 1);
  assert.equal(MT.readVars(ws.live, tile.id, 0).count, 7);
  const panel = MT.compilePanel(ws.live), html = MT.vnodeToHTML(panel.root);
  assert.ok(html.indexOf("Approach to wake") < html.indexOf('data-bind="mt_pavilion|count"'));
  assert.ok(html.indexOf('data-bind="mt_pavilion|count"') < html.indexOf('data-signal="mt_pavilion:increment"'));
  assert.equal(MT.act(ws, { do: "signal", tile: tile.id, name: "increment" }).ok, true);
  assert.equal(MT.readVars(ws.live, tile.id, 0).count, 8);
  MT.act(ws, { do: "settle", from: [7, 0, 0] });
  assert.equal(MT.isAwake(ws.live, tile.id, "counter"), false);
  MT.act(ws, { do: "settle", from: [0, 0, 0] });
  assert.equal(MT.readVars(ws.live, tile.id, 0).count, 8);
  assert.equal(MT.structHash(ws.live), matter);
  assert.equal(MT.act(ws, { do: "reconstruct", fromGenesis: true }).matches_live, true);
});

test("installation rolls back exactly and the kit retains geometry after transport to another world", () => {
  const { kit } = produce(), first = install(kit), second = install(copy(kit));
  const a = MT.compileMesh(first.ws.live.tiles.mt_pavilion, first.ws.live), b = MT.compileMesh(second.ws.live.tiles.mt_pavilion, second.ws.live);
  assert.equal(a.hold, null); assert.deepEqual(a.P, b.P); assert.deepEqual(a.T, b.T);
  const rolled = MT.rollback(first.ws, first.receipt.rollback_token);
  assert.equal(rolled.exact, true); assert.equal(MT.hashOf(first.ws.live), first.before);
  assert.equal(MT.act(first.ws, { do: "reconstruct", fromGenesis: true }).matches_live, true);
});

test("missing UI eligibility blocks assembly and verification instead of inventing a new form", () => {
  const request = copy(fixture); request.tasks.find(t => t.id === "assemble").packet.inputs = [];
  const out = run(request, env.registry), steps = out.candidate.route;
  assert.equal(out.status, "HOLD");
  assert.equal(steps.find(s => s.id === "assemble").response.holds[0].code, "HOLD_VIEW_TARGET_FORM_MISSING");
  assert.equal(steps.find(s => s.id === "verify").execution, "BLOCKED");
  assert.equal(createKit(request, env.registry, env.adapters).candidate.kit, null);
});

test("missing definition closure and explicit surface mistakes are preserved as holds without a portable output", () => {
  const missing = copy(fixture); missing.tasks.find(t => t.id === "assemble").packet.world_requirements.definitions = {};
  const held = createKit(missing, env.registry, env.adapters);
  assert.equal(held.status, "HOLD"); assert.equal(held.candidate.kit, null);
  assert.equal(held.candidate.kit_build.holds[0].code, "HOLD_KIT_DEFINITION_MISSING");
  const bad = copy(fixture); bad.tasks.find(t => t.id === "surface").packet.intent.surface_rule = false;
  const failed = createKit(bad, env.registry, env.adapters);
  assert.equal(failed.status, "HOLD"); assert.equal(failed.candidate.kit, null);
  assert.equal(failed.candidate.report.candidate.route.find(t => t.id === "surface").response.holds[0].code, "HOLD_SURFACE_RULE_INVALID");
});

test("a failed independent verifier or mismatched selected verification cannot publish a successful creation", () => {
  const rejected = createKit(fixture, env.registry, { ...env.adapters, verifyKit: () => ({ status: "FAIL", errors: [{ code: "SEEDED_FAILURE" }] }) });
  assert.equal(rejected.status, "FAIL"); assert.equal(rejected.candidate.kit, null);
  const unbound = createKit(fixture, env.registry, { ...env.adapters, verification_task: "shape" });
  assert.equal(unbound.status, "HOLD"); assert.equal(unbound.holds[0].code, "HOLD_CREATION_VERIFICATION_UNBOUND");
  const absent = createKit(fixture, env.registry, {});
  assert.equal(absent.status, "HOLD"); assert.equal(absent.holds[0].code, "HOLD_CREATION_ADAPTER_MISSING");
});
