const test = require("node:test"), assert = require("node:assert/strict");
const { run, PLAN_SCHEMA } = require("../src");
const { result } = require("../src/envelope");
const { digest } = require("../src/data");

const packet = id => ({ envelope_version: "0.1", request_id: id, goal: "Build " + id });
const task = (id, kind, more = {}) => ({ id, kind, packet: packet(id), ...more });
const plan = tasks => ({ ...packet("plan"), schema: PLAN_SCHEMA, tasks });
const copy = x => JSON.parse(JSON.stringify(x));
function registry(calls = []) {
  return Object.fromEntries(["form", "surface", "capability", "interface", "assembly", "verification"].map(kind => {
    const identity = { id: "test." + kind, version: "1" };
    return [kind, { ...identity, run: p => {
      calls.push(p.request_id);
      const candidate = kind === "assembly" ? { parts: p.inputs.map(x => x.candidate) } : kind === "verification" ? p.candidate : { part: kind };
      return result(p, identity, kind === "verification" ? "PASS" : "CANDIDATE", {
        candidate, warnings: [{ code: "RUNTIME_NOT_TESTED" }], evidence: [{ kind: "STRUCTURAL", status: "PASS" }]
      });
    } }];
  }));
}
const recipe = () => plan([
  task("verify", "verification", { candidate_from: "assemble" }),
  task("paint", "surface"), task("shape", "form"),
  task("assemble", "assembly", { inputs_from: ["shape", "paint"] })
]);
const route = out => Object.fromEntries(out.candidate.route.map(x => [x.id, x]));

test("dependency composition transports complete envelopes, verifies the assembled candidate and retains exact traces", () => {
  const calls = [], input = recipe(), before = copy(input), out = run(input, registry(calls)), steps = route(out);
  assert.equal(out.status, "CANDIDATE");
  assert.deepEqual(calls, ["shape", "paint", "assemble", "verify"]);
  assert.deepEqual(out.candidate.order, calls);
  assert.deepEqual(out.candidate.terminal_tasks, ["verify"]);
  assert.deepEqual(steps.assemble.packet.inputs, [steps.shape.response, steps.paint.response]);
  assert.deepEqual(steps.verify.packet.candidate, steps.assemble.response.candidate);
  assert.equal(steps.verify.response.status, "PASS");
  for (const step of Object.values(steps)) {
    assert.equal(step.packet_sha256, digest(step.packet));
    assert.equal(step.response_sha256, digest(step.response));
    for (const source of step.sources) assert.equal(source.response_sha256, steps[source.task].response_sha256);
  }
  assert.equal(out.warnings.length, 4);
  assert.deepEqual(input, before);
});

function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((x, i) => permutations(items.filter((_, j) => i !== j)).map(rest => [x, ...rest]));
}
test("all 24 declaration orders of the same named graph produce identical bytes and execution order", () => {
  const input = recipe(), expected = JSON.stringify(run(input, registry()));
  for (const tasks of permutations(input.tasks)) assert.equal(JSON.stringify(run({ ...input, tasks }, registry())), expected);
});

test("dependencies take precedence over the usual specialist ordering", () => {
  const calls = [];
  const out = run(plan([task("shape", "form", { depends_on: ["behavior"] }), task("behavior", "capability")]), registry(calls));
  assert.equal(out.status, "CANDIDATE");
  assert.deepEqual(calls, ["behavior", "shape"]);
});

test("complete preflight rejects missing machines, cycles, missing sources, duplicate ids and malformed references before any invocation", () => {
  const cases = [
    p => { p.tasks[0].kind = "unknown"; },
    p => { p.tasks[0].candidate_from = "absent"; },
    p => { p.tasks[2].depends_on = ["verify"]; },
    p => { p.tasks[0].id = "shape"; },
    p => { p.tasks[0].packet.request_id = "shape"; },
    p => { p.tasks[3].inputs_from = ["shape", "shape"]; },
    p => { p.tasks[3].inputs_from = "shape"; },
    p => { p.tasks[0].packet.candidate = { replaced: true }; },
    p => { p.tasks[0].mispelled_dependency = "shape"; },
    p => { p.tasks = []; },
    p => { delete p.tasks[0].packet.goal; },
  ];
  for (const mutate of cases) {
    const input = recipe(), calls = []; mutate(input);
    assert.equal(run(input, registry(calls)).status, "HOLD"); assert.deepEqual(calls, []);
  }
  const calls = [], r = registry(calls); delete r.verification;
  assert.equal(run(recipe(), r).status, "HOLD"); assert.deepEqual(calls, []);
});

test("literal assembly inputs remain first and referenced inputs preserve their authored order", () => {
  const p = recipe(), literal = { candidate: { form_hints: ["ui_panel"] }, provenance: { caller: "explicit" } };
  p.tasks[3].packet.inputs = [literal]; p.tasks[3].inputs_from.reverse();
  const steps = route(run(p, registry()));
  assert.deepEqual(steps.assemble.packet.inputs, [literal, steps.paint.response, steps.shape.response]);
});

test("a failed child blocks its descendants while an independent machine still executes and the failure packet remains inspectable", () => {
  const p = recipe(); p.tasks.push(task("independent", "capability"));
  const calls = [], r = registry(calls);
  r.form.run = p => { calls.push(p.request_id); return result(p, r.form, "FAIL", { holds: [{ code: "BAD_GEOMETRY" }] }); };
  const out = run(p, r), steps = route(out);
  assert.equal(out.status, "FAIL");
  assert.deepEqual(calls, ["shape", "paint", "independent"]);
  assert.equal(steps.assemble.execution, "BLOCKED"); assert.equal(steps.verify.execution, "BLOCKED");
  assert.equal(steps.assemble.packet, null);
  assert.equal(steps.shape.response.holds[0].code, "BAD_GEOMETRY");
  assert.equal(steps.independent.status, "CANDIDATE");
});

test("machine exceptions become scoped holds and do not erase prior successful work", () => {
  const calls = [], r = registry(calls); r.surface.run = () => { throw new Error("surface resolver missing"); };
  const out = run(recipe(), r), steps = route(out);
  assert.equal(out.status, "HOLD"); assert.equal(steps.shape.status, "CANDIDATE");
  assert.equal(steps.paint.hold.code, "HOLD_MACHINE_EXECUTION_FAILED");
  assert.equal(steps.verify.execution, "BLOCKED");
});

test("wrong request or machine identities, contradictory holds and missing envelopes cannot masquerade as usable results", () => {
  for (const mutate of [
    x => { x.request_id = "stale"; }, x => { x.machine.id = "other"; }, x => { x.machine.version = "2"; },
    x => { x.status = "DONE"; }, x => { x.candidate = null; }, x => { x.holds.push({ code: "UNRESOLVED" }); },
    x => { delete x.envelope_version; }, x => { x.warnings = {}; }, () => null
  ]) {
    const r = registry(), original = r.form.run;
    r.form.run = p => { const x = original(p); const v = mutate(x); return v === null ? null : x; };
    const out = run(recipe(), r);
    assert.equal(out.status, "HOLD");
    assert.equal(route(out).shape.hold.code, "HOLD_MACHINE_RESPONSE_INVALID");
    assert.equal(route(out).assemble.execution, "BLOCKED");
  }
});

test("a machine that mutates its input is held without changing the request or upstream evidence", () => {
  const input = recipe(), before = copy(input), r = registry(), original = r.assembly.run;
  r.assembly.run = p => { p.inputs[0].candidate.part = "rewritten"; return original(p); };
  const out = run(input, r), steps = route(out);
  assert.equal(out.status, "HOLD");
  assert.equal(steps.assemble.hold.code, "HOLD_MACHINE_MUTATED_PACKET");
  assert.equal(steps.shape.response.candidate.part, "form");
  assert.equal(steps.assemble.packet.inputs[0].candidate.part, "form");
  assert.deepEqual(input, before);
});

test("missing candidate data in a PASS source blocks binding rather than invoking verification with an empty candidate", () => {
  const p = recipe(), r = registry();
  r.assembly.run = p => result(p, r.assembly, "PASS");
  const out = run(p, r);
  assert.equal(out.status, "HOLD");
  assert.equal(route(out).verify.execution, "BLOCKED");
  assert.equal(route(out).verify.hold.code, "HOLD_TASK_BINDING_FAILED");
});

test("invalid JSON transport is held without invoking code or coercing authored numbers", () => {
  for (const mutate of [p => { p.tasks[0].packet.number = NaN; }, p => { p.loop = p; }, p => { p.tasks[0].packet.holes = new Array(2); }]) {
    const p = recipe(), calls = []; mutate(p);
    const out = run(p, registry(calls)); assert.equal(out.status, "HOLD"); assert.equal(out.holds[0].code, "HOLD_PLAN_JSON_INVALID"); assert.deepEqual(calls, []);
  }
});

test("async callbacks cannot silently pass through the synchronous machine contract", () => {
  const r = registry(); r.form.run = async () => { throw new Error("asynchronous failure"); };
  const out = run(recipe(), r);
  assert.equal(out.status, "HOLD"); assert.equal(route(out).shape.hold.code, "HOLD_MACHINE_EXECUTION_FAILED");
});

test("task and packet budgets stop invalid plans before any machine executes", () => {
  const calls = [], r = registry(calls);
  const tooMany = plan(Array.from({ length: 65 }, (_, i) => task("shape_" + i, "form")));
  assert.equal(run(tooMany, r).holds[0].code, "HOLD_TASKS_INVALID");
  const tooLarge = recipe(); tooLarge.tasks[0].packet.text = "x".repeat(2 * 1024 * 1024);
  assert.equal(run(tooLarge, r).holds[0].code, "HOLD_PLAN_JSON_INVALID");
  assert.deepEqual(calls, []);
});

test("report growth is bounded and later work stops with explicit evidence instead of an oversized successful result", () => {
  const calls = [], r = registry(calls), original = r.form.run;
  r.form.run = p => { const out = original(p); out.candidate.payload = "x".repeat(900000); return out; };
  const p = plan(Array.from({ length: 24 }, (_, i) => task("shape_" + String(i).padStart(2, "0"), "form")));
  const out = run(p, r);
  assert.equal(out.status, "HOLD");
  assert.ok(out.holds.some(h => h.code === "HOLD_REPORT_BUDGET_EXCEEDED"));
  assert.ok(calls.length < 24);
  assert.ok(Buffer.byteLength(JSON.stringify(out)) <= 16 * 1024 * 1024);
});
